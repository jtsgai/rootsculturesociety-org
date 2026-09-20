-- A member record must include private contact details for Society administration.
-- These fields stay protected by the existing owner/admin row-level policies.

alter table public.members add column if not exists contact_phone text;

alter table public.members drop constraint if exists members_contact_email_required;
alter table public.members add constraint members_contact_email_required
  check (contact_email is not null and char_length(trim(contact_email)) > 3) not valid;

alter table public.members drop constraint if exists members_contact_phone_required;
alter table public.members add constraint members_contact_phone_required
  check (contact_phone is not null and char_length(trim(contact_phone)) >= 8) not valid;
