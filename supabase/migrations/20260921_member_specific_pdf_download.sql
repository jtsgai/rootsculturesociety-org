-- PDF download is granted per active member, never as a site-wide entitlement.
-- The browser creates the PDF locally from that member's private preview;
-- this does not expose original image files or any other member data.

alter table public.members
  add column if not exists pdf_download_enabled boolean not null default false;

comment on column public.members.pdf_download_enabled is
  'Whether this specific active member may use Print / Save as PDF from their private book overview.';
