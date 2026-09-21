-- Structured lineage details used by both the member editor and print preview.
-- Existing RLS policies on public.people continue to protect these columns.

alter table public.people
  add column if not exists birth_date date,
  add column if not exists death_date date,
  add column if not exists residence_code text,
  add column if not exists genealogy_markers text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'people_life_dates_valid'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_life_dates_valid
      check (death_date is null or birth_date is null or death_date >= birth_date);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_residence_code_valid'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_residence_code_valid
      check (residence_code is null or residence_code in ('S', 'M', 'HK', 'UK', 'US'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_genealogy_markers_valid'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_genealogy_markers_valid
      check (genealogy_markers <@ array[
        'compiler', 'distinguished', 'unreachable',
        'no_descendants', 'died_young', 'continuing'
      ]::text[]);
  end if;
end $$;

create index if not exists people_book_generation_idx
  on public.people (book_id, generation_number);
create index if not exists people_father_id_idx on public.people (father_id);
create index if not exists people_mother_id_idx on public.people (mother_id);
create index if not exists people_spouse_id_idx on public.people (spouse_id);
