-- Membership retention: expired members lose member access immediately;
-- administrators may retain frozen data for the defined 90-day renewal window.

alter table public.members
  add column if not exists closed_at timestamptz,
  add column if not exists purge_after timestamptz;

create index if not exists members_purge_after_idx on public.members (purge_after)
where purge_after is not null;

create or replace function public.can_access_book(target_book uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.owns_book(target_book) and public.is_active_member());
$$;

drop policy if exists "public stories: member reads and edits own" on public.public_story_sections;
create policy "public stories: member reads and edits own" on public.public_story_sections for select to authenticated
using ((member_id = auth.uid() and public.is_active_member()) or public.is_admin());

drop policy if exists "public stories: active member updates own" on public.public_story_sections;
create policy "public stories: active member updates own" on public.public_story_sections for update to authenticated
using (member_id = auth.uid() and public.is_active_member() and public.owns_book(book_id))
with check (member_id = auth.uid() and public.is_active_member() and public.owns_book(book_id));

drop policy if exists "ai wallets: member reads own or admin" on public.ai_wallets;
create policy "ai wallets: member reads own or admin" on public.ai_wallets for select to authenticated
using ((member_id = auth.uid() and public.is_active_member()) or public.is_admin());

drop policy if exists "ai ledger: member reads own or admin" on public.ai_credit_ledger;
create policy "ai ledger: member reads own or admin" on public.ai_credit_ledger for select to authenticated
using ((member_id = auth.uid() and public.is_active_member()) or public.is_admin());

drop policy if exists "ai jobs: member reads own or admin" on public.ai_jobs;
create policy "ai jobs: member reads own or admin" on public.ai_jobs for select to authenticated
using ((member_id = auth.uid() and public.is_active_member()) or public.is_admin());

drop policy if exists "book exports: member reads own or admin" on public.book_exports;
create policy "book exports: member reads own or admin" on public.book_exports for select to authenticated
using ((member_id = auth.uid() and public.is_active_member()) or public.is_admin());

drop policy if exists "genealogy media: owner or admin reads" on storage.objects;
create policy "genealogy media: owner or admin reads" on storage.objects for select to authenticated
using (
  bucket_id = 'genealogy-media'
  and (
    public.is_admin()
    or ((storage.foldername(name))[1] = auth.uid()::text and name not like '%/original.%')
  )
);
