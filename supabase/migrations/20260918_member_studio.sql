-- Roots Culture Society of Singapore: private member Photo Genealogy
-- Run this migration in a new Supabase project before enabling the studio.
-- Service-role credentials are used only by the Edge Function, never by the browser.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key references public.profiles(id) on delete cascade,
  member_id text not null unique check (member_id ~ '^R[1-9][0-9]*$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 160),
  contact_email text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'expired')),
  must_change_password boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.genealogy_books (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  title text,
  generation_one_ancestor text,
  dialect_group text,
  ancestral_place text,
  dedication text,
  cover_path text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.genealogy_books(id) on delete cascade,
  method smallint not null check (method between 1 and 8),
  content jsonb not null default '{}'::jsonb,
  is_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (book_id, method)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.genealogy_books(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  generation_number integer not null check (generation_number > 0),
  sex text check (sex in ('female', 'male', 'unspecified')),
  life_status text check (life_status in ('living', 'deceased', 'unspecified')),
  father_id uuid references public.people(id) on delete set null,
  mother_id uuid references public.people(id) on delete set null,
  spouse_id uuid references public.people(id) on delete set null,
  birth_year integer check (birth_year between 1800 and 2200),
  occupation text,
  education text,
  phone text,
  address text,
  photo_path text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  member_id uuid references public.members(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger members_updated_at before update on public.members
for each row execute procedure public.set_updated_at();
create trigger books_updated_at before update on public.genealogy_books
for each row execute procedure public.set_updated_at();
create trigger people_updated_at before update on public.people
for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and status = 'active'
      and starts_on <= current_date and ends_on >= current_date
  );
$$;

create or replace function public.owns_book(target_book uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.genealogy_books where id = target_book and member_id = auth.uid());
$$;

create or replace function public.can_access_book(target_book uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.owns_book(target_book);
$$;

create or replace function public.complete_initial_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.members set must_change_password = false where id = auth.uid();
end;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_active_member() from public;
revoke all on function public.owns_book(uuid) from public;
revoke all on function public.can_access_book(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.owns_book(uuid) to authenticated;
grant execute on function public.can_access_book(uuid) to authenticated;
grant execute on function public.complete_initial_password_change() to authenticated;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.genealogy_books enable row level security;
alter table public.studio_sections enable row level security;
alter table public.people enable row level security;
alter table public.member_audit_log enable row level security;

create policy "profiles: read self or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "members: read self or admin" on public.members for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "members: admin manages membership" on public.members for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "books: read own or admin" on public.genealogy_books for select to authenticated
using (public.can_access_book(id));
create policy "books: active owner creates own" on public.genealogy_books for insert to authenticated
with check (member_id = auth.uid() and public.is_active_member());
create policy "books: active owner updates own" on public.genealogy_books for update to authenticated
using (public.is_admin() or (member_id = auth.uid() and public.is_active_member()))
with check (public.is_admin() or (member_id = auth.uid() and public.is_active_member()));
create policy "books: admin deletes" on public.genealogy_books for delete to authenticated using (public.is_admin());
create policy "sections: read own or admin" on public.studio_sections for select to authenticated
using (public.can_access_book(book_id));
create policy "sections: active owner writes own" on public.studio_sections for all to authenticated
using (public.is_admin() or (public.owns_book(book_id) and public.is_active_member()))
with check (public.is_admin() or (public.owns_book(book_id) and public.is_active_member()));
create policy "people: read own or admin" on public.people for select to authenticated
using (public.can_access_book(book_id));
create policy "people: active owner writes own" on public.people for all to authenticated
using (public.is_admin() or (public.owns_book(book_id) and public.is_active_member()))
with check (public.is_admin() or (public.owns_book(book_id) and public.is_active_member()));
create policy "audit: admin only" on public.member_audit_log for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('genealogy-media', 'genealogy-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "genealogy media: owner or admin reads" on storage.objects for select to authenticated
using (bucket_id = 'genealogy-media' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy "genealogy media: active owner uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'genealogy-media' and public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "genealogy media: active owner updates" on storage.objects for update to authenticated
using (bucket_id = 'genealogy-media' and (public.is_admin() or (public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text)))
with check (bucket_id = 'genealogy-media' and (public.is_admin() or (public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy "genealogy media: active owner deletes" on storage.objects for delete to authenticated
using (bucket_id = 'genealogy-media' and (public.is_admin() or (public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text)));
