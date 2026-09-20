-- Legacy media protection: members may see processed display variants only.
-- Existing paths that do not have a display/thumb variant remain available to
-- administrators for recovery, but are not exposed through member Storage URLs.

drop policy if exists "genealogy media: owner or admin reads" on storage.objects;
create policy "genealogy media: owner or admin reads" on storage.objects for select to authenticated
using (
  bucket_id = 'genealogy-media'
  and (
    public.is_admin()
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and (name like '%/display.jpg' or name like '%/thumb.jpg')
    )
  )
);
