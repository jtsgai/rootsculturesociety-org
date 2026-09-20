-- Member Studio extensions: public chapter publishing, exports and metered AI.
-- This migration creates interfaces only. No AI provider or payment service is enabled.

create table public.ai_wallets (
  member_id uuid primary key references public.members(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_consumed integer not null default 0 check (lifetime_consumed >= 0),
  updated_at timestamptz not null default now()
);

create table public.ai_credit_ledger (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  delta integer not null check (delta <> 0),
  kind text not null check (kind in ('grant', 'purchase', 'consume', 'refund', 'adjustment')),
  feature text check (feature in ('cover', 'restore', 'prompt', 'research')),
  request_id uuid unique,
  note text,
  created_at timestamptz not null default now()
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  book_id uuid not null references public.genealogy_books(id) on delete cascade,
  method smallint check (method between 1 and 8),
  feature text not null check (feature in ('cover', 'restore', 'prompt', 'research')),
  provider text not null default 'unconfigured',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  request jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  input_path text,
  output_path text,
  credits_reserved integer not null default 0 check (credits_reserved >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.public_story_sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.genealogy_books(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  method smallint not null check (method between 1 and 8),
  slug text not null unique,
  title text not null check (char_length(trim(title)) between 1 and 180),
  content jsonb not null default '{}'::jsonb,
  media_paths text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'withdrawn')),
  consent_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, method)
);

create table public.book_exports (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.genealogy_books(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  format text not null check (format in ('web', 'pdf')),
  status text not null default 'queued' check (status in ('queued', 'running', 'ready', 'failed')),
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger ai_wallets_updated_at before update on public.ai_wallets
for each row execute procedure public.set_updated_at();
create trigger public_story_sections_updated_at before update on public.public_story_sections
for each row execute procedure public.set_updated_at();

create or replace function public.reserve_ai_credits(
  requested_feature text,
  requested_cost integer,
  request_token uuid default gen_random_uuid()
)
returns table (approved boolean, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  member_uuid uuid := auth.uid();
  current_balance integer;
  new_balance integer;
begin
  if member_uuid is null or not public.is_active_member() then
    return query select false, 0;
    return;
  end if;
  if requested_feature not in ('cover', 'restore', 'prompt', 'research') or requested_cost <= 0 then
    raise exception 'Invalid AI credit request';
  end if;

  insert into public.ai_wallets (member_id) values (member_uuid)
  on conflict (member_id) do nothing;

  if exists (
    select 1 from public.ai_credit_ledger
    where member_id = member_uuid and request_id = request_token and kind = 'consume'
  ) then
    select balance into current_balance from public.ai_wallets where member_id = member_uuid;
    return query select true, current_balance;
    return;
  end if;

  update public.ai_wallets
  set balance = balance - requested_cost,
      lifetime_consumed = lifetime_consumed + requested_cost,
      updated_at = now()
  where member_id = member_uuid and balance >= requested_cost
  returning balance into new_balance;

  if new_balance is null then
    select balance into current_balance from public.ai_wallets where member_id = member_uuid;
    return query select false, coalesce(current_balance, 0);
    return;
  end if;

  insert into public.ai_credit_ledger (member_id, delta, kind, feature, request_id)
  values (member_uuid, -requested_cost, 'consume', requested_feature, request_token);
  return query select true, new_balance;
end;
$$;

create or replace function public.grant_ai_credits(
  target_member_id uuid,
  credit_amount integer,
  credit_kind text default 'grant',
  credit_note text default null
)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  new_balance integer;
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if credit_amount <= 0 or credit_kind not in ('grant', 'purchase', 'refund', 'adjustment') then
    raise exception 'Invalid AI credit grant';
  end if;
  insert into public.ai_wallets (member_id) values (target_member_id)
  on conflict (member_id) do nothing;
  update public.ai_wallets set balance = balance + credit_amount, updated_at = now()
  where member_id = target_member_id returning balance into new_balance;
  insert into public.ai_credit_ledger (member_id, delta, kind, note)
  values (target_member_id, credit_amount, credit_kind, credit_note);
  return new_balance;
end;
$$;

grant execute on function public.reserve_ai_credits(text, integer, uuid) to authenticated;
grant execute on function public.grant_ai_credits(uuid, integer, text, text) to authenticated;

alter table public.ai_wallets enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.public_story_sections enable row level security;
alter table public.book_exports enable row level security;

create policy "ai wallets: member reads own or admin" on public.ai_wallets for select to authenticated
using (member_id = auth.uid() or public.is_admin());
create policy "ai wallets: admin manages" on public.ai_wallets for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "ai ledger: member reads own or admin" on public.ai_credit_ledger for select to authenticated
using (member_id = auth.uid() or public.is_admin());

create policy "ai jobs: member reads own or admin" on public.ai_jobs for select to authenticated
using (member_id = auth.uid() or public.is_admin());

create policy "public stories: published content is readable" on public.public_story_sections for select to anon, authenticated
using (status = 'published');
create policy "public stories: member reads and edits own" on public.public_story_sections for select to authenticated
using (member_id = auth.uid() or public.is_admin());
create policy "public stories: active member creates own" on public.public_story_sections for insert to authenticated
with check (member_id = auth.uid() and public.is_active_member() and public.owns_book(book_id));
create policy "public stories: active member updates own" on public.public_story_sections for update to authenticated
using (member_id = auth.uid() and public.is_active_member() and public.owns_book(book_id))
with check (member_id = auth.uid() and public.is_active_member() and public.owns_book(book_id));
create policy "public stories: admin reviews" on public.public_story_sections for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "book exports: member reads own or admin" on public.book_exports for select to authenticated
using (member_id = auth.uid() or public.is_admin());
create policy "book exports: active member requests own" on public.book_exports for insert to authenticated
with check (member_id = auth.uid() and public.is_active_member() and public.owns_book(book_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('genealogy-ai', 'genealogy-ai', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "genealogy ai: owner or admin reads" on storage.objects for select to authenticated
using (bucket_id = 'genealogy-ai' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy "genealogy ai: active owner uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'genealogy-ai' and public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "genealogy ai: active owner deletes" on storage.objects for delete to authenticated
using (bucket_id = 'genealogy-ai' and (public.is_admin() or (public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text)));
