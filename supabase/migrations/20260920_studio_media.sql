-- Private media index for the member Photo Genealogy studio.
-- Original files stay in the private genealogy-media bucket.

create table public.studio_media (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.genealogy_books(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  method smallint not null check (method between 1 and 8),
  storage_path text not null unique,
  caption text,
  kind text not null default 'image' check (kind in ('image')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index studio_media_book_method_idx on public.studio_media (book_id, method, created_at);

create trigger studio_media_updated_at before update on public.studio_media
for each row execute procedure public.set_updated_at();

alter table public.studio_media enable row level security;

create policy "studio media: owner or admin reads" on public.studio_media for select to authenticated
using (public.can_access_book(book_id));

create policy "studio media: active owner creates" on public.studio_media for insert to authenticated
with check (
  member_id = auth.uid()
  and public.owns_book(book_id)
  and public.is_active_member()
);

create policy "studio media: owner or admin updates" on public.studio_media for update to authenticated
using (public.is_admin() or (member_id = auth.uid() and public.owns_book(book_id) and public.is_active_member()))
with check (public.is_admin() or (member_id = auth.uid() and public.owns_book(book_id) and public.is_active_member()));

create policy "studio media: owner or admin deletes" on public.studio_media for delete to authenticated
using (public.is_admin() or (member_id = auth.uid() and public.owns_book(book_id) and public.is_active_member()));
