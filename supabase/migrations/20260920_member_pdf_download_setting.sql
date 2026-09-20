-- The administrator controls whether active members may use the browser's
-- private preview -> Print / Save as PDF action. Original media remains admin-only.

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default 'false'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site settings: active members and admins read" on public.site_settings;
create policy "site settings: active members and admins read" on public.site_settings for select to authenticated
using (public.is_admin() or public.is_active_member());

drop policy if exists "site settings: admins manage" on public.site_settings;
create policy "site settings: admins manage" on public.site_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (key, value)
values ('member_pdf_download_enabled', 'false'::jsonb)
on conflict (key) do nothing;
