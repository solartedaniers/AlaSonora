-- Review and run manually in the Supabase SQL Editor. Not executed by Claude.
--
-- El bucket "avatars" no tenía políticas RLS de INSERT/UPDATE para el rol
-- authenticated en storage.objects (confirmado con una sesión real: subida
-- rechazada con 400 / "new row violates row-level security policy" incluso
-- con un usuario autenticado subiendo a su propia carpeta {uid}/...). La
-- lectura pública ya funciona (bucket configurado como público), por lo que
-- solo faltan estas dos políticas, replicando el mismo patrón usado en
-- 2026-09-16_observer_photos_policies_and_iucn_constraint.sql.

create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
