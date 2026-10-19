-- Destructive rollback: export payment records first. Restores earlier migration behavior.
-- service_role EXECUTE grants are intentionally kept (Supabase default; edge functions rely on them).
begin;
drop policy if exists "p1: password required" on public.ai_wallets;
drop policy if exists "p1: password required" on public.ai_credit_ledger;
drop policy if exists "p1: password required" on public.ai_jobs;
drop policy if exists "p1: password required" on public.book_exports;
drop policy if exists "p1: password required" on public.member_policy_acceptances;
drop policy if exists "p1: password required" on public.activity_event_editors;
drop policy if exists "p1: private storage password required" on storage.objects;
create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and status = 'active'
      and starts_on <= current_date and ends_on >= current_date
  );
$$;

create or replace function public.complete_initial_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.members set must_change_password = false where id = auth.uid();
end;
$$;

create or replace function public.can_manage_activity_events()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.activity_event_editors
        where profile_id = auth.uid()
      )
    );
$$;

drop function if exists public.provision_member(uuid, text, text, text, text, date, date, uuid);
drop function if exists public.next_member_no();
drop function if exists public.mark_member_password_reset(uuid);
drop function if exists public.record_membership_payment(uuid, numeric, text, text, date, date, date, text, boolean, uuid);
drop table if exists public.membership_payments;
drop table if exists public.member_password_guards;
alter function public.set_updated_at() reset search_path;
grant execute on function public.complete_initial_password_change() to public;
grant execute on function public.reserve_ai_credits(text, integer, uuid) to public;
grant execute on function public.grant_ai_credits(uuid, integer, text, text) to public;
commit;
