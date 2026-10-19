-- RCSS P1. Apply before redeploying admin-members. No member rows are seeded.
begin;
alter function public.set_updated_at() set search_path = public;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and status = 'active'
      and not must_change_password
      and starts_on <= current_date and ends_on >= current_date
  );
$$;

-- Capture only password hashes, never plaintext. Members cannot read this table.
create table if not exists public.member_password_guards (
  member_id uuid primary key references public.members(id) on delete cascade,
  initial_hash text not null
);
alter table public.member_password_guards enable row level security;
revoke all on public.member_password_guards from public, anon, authenticated;
grant all on public.member_password_guards to service_role;
-- Existing accounts awaiting their first password change are also protected.
insert into public.member_password_guards (member_id, initial_hash)
select m.id, u.encrypted_password from public.members m join auth.users u on u.id = m.id
where m.must_change_password and u.encrypted_password is not null
on conflict (member_id) do nothing;

create or replace function public.complete_initial_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  perform 1 from public.members where id = auth.uid() for update;
  if exists (select 1 from public.members where id = auth.uid() and must_change_password) then
    if not exists (
      select 1 from public.member_password_guards g join auth.users u on u.id = g.member_id
      where g.member_id = auth.uid() and g.initial_hash not in ('pending', 'changed') and u.encrypted_password is not null and u.encrypted_password is distinct from g.initial_hash
    ) then raise exception '请先设置新的密码。'; end if;
    update public.members set must_change_password = false where id = auth.uid();
    update public.member_password_guards set initial_hash = 'changed' where member_id = auth.uid();
  end if;
end;
$$;

-- Service-only reset marker; called after Auth has installed the new initial password.
create or replace function public.mark_member_password_reset(target_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.members set must_change_password = true where id = target_member;
  insert into public.member_password_guards (member_id, initial_hash)
  select target_member, encrypted_password from auth.users where id = target_member
  on conflict (member_id) do update set initial_hash = excluded.initial_hash;
end;
$$;

create or replace function public.next_member_no()
returns text language plpgsql security definer set search_path = public as $$
declare result text;
begin
  select 'R' || n::text into result from generate_series(1003, 9999) n
  where n <> 1099 and not exists (select 1 from public.members where member_id = 'R' || n::text)
  order by n limit 1;
  if result is null then raise exception '会员号已用完，请联系系统管理员。'; end if;
  return result;
end;
$$;

-- The lock covers both suggested/manual number checks AND insertion.
create or replace function public.provision_member(
  target_user uuid, requested_no text, member_name text, email text, phone text,
  start_date date, end_date date, operator_id uuid
)
returns text language plpgsql security definer set search_path = public as $$
declare allocated text := nullif(upper(trim(requested_no)), '');
begin
  perform pg_advisory_xact_lock(20261019, 1);
  if allocated is null then allocated := public.next_member_no(); end if;
  if allocated !~ '^R[1-9][0-9]{3}$' then raise exception '会员号须为 R 加四位数字。'; end if;
  if exists (select 1 from public.members where member_id = allocated) then
    raise exception '会员号已存在，请使用其他会员号或留空自动分配。';
  end if;
  insert into public.profiles (id, role) values (target_user, 'member');
  insert into public.members (id, member_id, display_name, contact_email, contact_phone, starts_on, ends_on, created_by)
  values (target_user, allocated, member_name, email, phone, start_date, end_date, operator_id);
  insert into public.genealogy_books (member_id) values (target_user);
  perform public.mark_member_password_reset(target_user);
  insert into public.member_audit_log (actor_id, member_id, action, metadata)
  values (operator_id, target_user, 'member_created', jsonb_build_object('member_id', allocated));
  return allocated;
end;
$$;

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(10,2) not null default 99.00 check (amount > 0),
  currency text not null default 'SGD',
  method text not null default 'PayNow',
  paynow_reference text,
  paid_on date not null default current_date,
  membership_start date,
  membership_end date,
  notes text,
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (membership_start is null or membership_end is null or membership_end >= membership_start)
);
create index if not exists membership_payments_member_id_idx on public.membership_payments(member_id);
alter table public.membership_payments enable row level security;
drop policy if exists "payments: admin manages" on public.membership_payments;
create policy "payments: admin manages" on public.membership_payments for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.membership_payments to authenticated, service_role;

create or replace function public.record_membership_payment(
  target_member uuid, payment_amount numeric, payment_method text, reference text,
  payment_date date, start_date date, end_date date, payment_notes text,
  extend_membership boolean, operator_id uuid
)
returns uuid language plpgsql security definer set search_path = public as $$
declare payment_id uuid; old_end date;
begin
  select ends_on into old_end from public.members where id = target_member for update;
  if not found then raise exception '找不到这位会员。'; end if;
  if extend_membership and (end_date is null or end_date < old_end) then
    raise exception '延长会籍时，请填写不早于现有结束日的日期。';
  end if;
  insert into public.membership_payments
    (member_id, amount, method, paynow_reference, paid_on, membership_start, membership_end, notes, recorded_by)
  values (target_member, payment_amount, payment_method, reference, payment_date, start_date, end_date, payment_notes, operator_id)
  returning id into payment_id;
  if extend_membership then
    update public.members set ends_on = end_date,
      status = case when status = 'expired' and end_date >= current_date then 'active' else status end,
      closed_at = case when status = 'expired' and end_date >= current_date then null else closed_at end,
      purge_after = case when status = 'expired' and end_date >= current_date then null else purge_after end
    where id = target_member;
  end if;
  return payment_id;
end;
$$;

-- Restrictive policies supplement all existing permissive policies.
drop policy if exists "p1: password required" on public.ai_wallets;
create policy "p1: password required" on public.ai_wallets as restrictive for all to authenticated
using (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
drop policy if exists "p1: password required" on public.ai_credit_ledger;
create policy "p1: password required" on public.ai_credit_ledger as restrictive for all to authenticated
using (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
drop policy if exists "p1: password required" on public.ai_jobs;
create policy "p1: password required" on public.ai_jobs as restrictive for all to authenticated
using (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
drop policy if exists "p1: password required" on public.book_exports;
create policy "p1: password required" on public.book_exports as restrictive for all to authenticated
using (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
drop policy if exists "p1: password required" on public.member_policy_acceptances;
create policy "p1: password required" on public.member_policy_acceptances as restrictive for all to authenticated
using (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
drop policy if exists "p1: password required" on public.activity_event_editors;
create policy "p1: password required" on public.activity_event_editors as restrictive for all to authenticated
using (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
drop policy if exists "p1: private storage password required" on storage.objects;
create policy "p1: private storage password required" on storage.objects as restrictive for all to authenticated
using (bucket_id not in ('genealogy-media', 'genealogy-ai') or public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password))
with check (bucket_id not in ('genealogy-media', 'genealogy-ai') or public.is_admin() or exists (select 1 from public.members where id = auth.uid() and not must_change_password));
create or replace function public.can_manage_activity_events()
returns boolean language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then false else public.is_admin()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.activity_event_editors
        where profile_id = auth.uid()
      )
    ) end;
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to service_role;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to service_role;
grant execute on function public.is_active_member() to authenticated;
revoke execute on function public.owns_book(uuid) from public, anon;
grant execute on function public.owns_book(uuid) to service_role;
grant execute on function public.owns_book(uuid) to authenticated;
revoke execute on function public.can_access_book(uuid) from public, anon;
grant execute on function public.can_access_book(uuid) to service_role;
grant execute on function public.can_access_book(uuid) to authenticated;
revoke execute on function public.complete_initial_password_change() from public, anon;
grant execute on function public.complete_initial_password_change() to service_role;
grant execute on function public.complete_initial_password_change() to authenticated;
revoke execute on function public.reserve_ai_credits(text, integer, uuid) from public, anon;
grant execute on function public.reserve_ai_credits(text, integer, uuid) to service_role;
grant execute on function public.reserve_ai_credits(text, integer, uuid) to authenticated;
revoke execute on function public.grant_ai_credits(uuid, integer, text, text) from public, anon;
grant execute on function public.grant_ai_credits(uuid, integer, text, text) to service_role;
grant execute on function public.grant_ai_credits(uuid, integer, text, text) to authenticated;
revoke execute on function public.next_member_no() from public, anon;
grant execute on function public.next_member_no() to service_role;
revoke execute on function public.next_member_no() from authenticated;
revoke execute on function public.provision_member(uuid, text, text, text, text, date, date, uuid) from public, anon;
grant execute on function public.provision_member(uuid, text, text, text, text, date, date, uuid) to service_role;
revoke execute on function public.provision_member(uuid, text, text, text, text, date, date, uuid) from authenticated;
revoke execute on function public.mark_member_password_reset(uuid) from public, anon;
grant execute on function public.mark_member_password_reset(uuid) to service_role;
revoke execute on function public.mark_member_password_reset(uuid) from authenticated;
revoke execute on function public.record_membership_payment(uuid, numeric, text, text, date, date, date, text, boolean, uuid) from public, anon;
grant execute on function public.record_membership_payment(uuid, numeric, text, text, date, date, date, text, boolean, uuid) to service_role;
revoke execute on function public.record_membership_payment(uuid, numeric, text, text, date, date, date, text, boolean, uuid) from authenticated;
commit;
