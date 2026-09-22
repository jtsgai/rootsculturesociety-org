-- Require members to acknowledge the current Privacy Policy and Member Terms
-- before entering the private Member Studio.

create table if not exists public.member_policy_acceptances (
  member_id uuid primary key references public.members(id) on delete cascade,
  privacy_version text not null,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists member_policy_acceptances_updated_at on public.member_policy_acceptances;

create trigger member_policy_acceptances_updated_at
before update on public.member_policy_acceptances
for each row execute procedure public.set_updated_at();

alter table public.member_policy_acceptances enable row level security;

drop policy if exists "policy acceptance member reads own or admin" on public.member_policy_acceptances;
create policy "policy acceptance member reads own or admin"
on public.member_policy_acceptances for select to authenticated
using (member_id = auth.uid() or public.is_admin());

drop policy if exists "policy acceptance member records own or admin" on public.member_policy_acceptances;
create policy "policy acceptance member records own or admin"
on public.member_policy_acceptances for insert to authenticated
with check (member_id = auth.uid() or public.is_admin());

drop policy if exists "policy acceptance member updates own or admin" on public.member_policy_acceptances;
create policy "policy acceptance member updates own or admin"
on public.member_policy_acceptances for update to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (member_id = auth.uid() or public.is_admin());
