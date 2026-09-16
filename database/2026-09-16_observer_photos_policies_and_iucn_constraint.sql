-- Review and run manually in the Supabase SQL Editor. Not executed by Claude.
--
-- 1. Storage policies for the "observer-photos" bucket (already created
--    manually, currently with zero policies). Same folder-per-owner pattern
--    as avatars/recordings: the frontend uploads directly to
--    "{auth.uid()}/{detectionId}-...", the backend never touches the bytes,
--    only persists the resulting path on Detection.observerPhotoStoragePath.
--
--    INSERT + UPDATE (not just INSERT): the frontend uploads with
--    upsert:true, and Storage internally does an UPDATE when an object at
--    that path already exists, not just an INSERT.
--
--    No SELECT policy on purpose: unlike avatars (unconditionally public),
--    an observer photo must respect the SAME visibility rule as the rest of
--    its Detection (PRIVATE -> owner + admins only, PUBLIC -> anyone). That
--    is a per-row runtime decision (visibility lives on public.detections,
--    not on the storage path), which a static Storage RLS policy can't
--    express cleanly. So reads never go directly to Storage: the backend
--    resolves a signed URL on demand (service_role, bypasses RLS) only
--    after checking the same visibility/ownership rule it already applies
--    to the recording's audio (see PrivateObjectSignedUrlResolver /
--    DetectionService.getByIdForRequester). Bucket must stay PRIVATE for
--    this to hold.
create policy "Observers can upload their own detection photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'observer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Observers can replace their own detection photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'observer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Physical CHECK constraint for species.iucn_status. The column had NONE
--    (Hibernate's ddl-auto=update only adds constraints to newly-created
--    columns, never retrofits existing ones), so today it's enforced only in
--    the Java IucnStatus enum. Verified before writing this: as of
--    2026-09-16 every row in `species` has iucn_status = 'NE' (4 rows, from
--    the AI-driven catalog so far) -- nothing outside the 8 valid values, so
--    this ALTER will not fail on existing data.
alter table species
  add constraint species_iucn_status_check
  check (iucn_status in ('LC','NT','VU','EN','CR','DD','NE','EW','EX'));
