-- Revisar y ejecutar a mano en el SQL Editor de Supabase. Claude no lo ejecutó.
--
-- Causa del 400 "new row violates row-level security policy" al subir el avatar (verificada
-- con la cuenta de ejemplo el 2026-10-14): la subida usaba upsert: true y, con upsert, Storage
-- exige permiso de SELECT además de INSERT/UPDATE. El bucket avatars no tenía ninguna política
-- de SELECT. Con la misma sesión, la subida sin upsert respondía 200. Borrar tampoco funcionaba
-- por la misma razón: Storage busca el objeto (SELECT) antes de eliminarlo.
--
-- El frontend ya no usa upsert (cada archivo tiene un nombre único), pero dejo SELECT/UPDATE/DELETE
-- limitados a la carpeta propia {auth.uid()}/ para reemplazar o borrar avatares sin volver a fallar.
-- Lectura pública: el bucket avatars ya es público (el avatar se ve en la cabecera y en el panel de
-- administración), y las URLs /object/public/ no pasan por RLS. Por eso NO agrego una política de
-- SELECT para anon: solo permitiría listar los archivos de todos por la API.

-- 1. Avatars: borro todas las políticas anteriores, incluidas las creadas a mano.
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can replace their own avatar" on storage.objects;
drop policy if exists "Usuarios autenticados pueden subir avatares" on storage.objects;
drop policy if exists "Usuarios pueden subir sus avatares" on storage.objects;
drop policy if exists "Usuarios pueden actualizar sus avatares" on storage.objects;
drop policy if exists "Usuarios pueden eliminar sus avatares" on storage.objects;
drop policy if exists "avatars select own" on storage.objects;
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;

create policy "avatars select own"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars insert own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. observer-photos (bucket privado): tenía el mismo patrón (upsert sin SELECT). El código ya no usa
-- upsert; agrego SELECT propio para que reemplazar la foto no vuelva a fallar. La lectura la firma el
-- backend con la service role, así que no hace falta acceso público.
drop policy if exists "observer-photos select own" on storage.objects;
create policy "observer-photos select own"
  on storage.objects for select to authenticated
  using (bucket_id = 'observer-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. recordings: ya funciona (INSERT y SELECT propios; la subida no usa upsert). Solo limpio el
-- duplicado: "recordings select own folder" estaba para el rol public con la misma condición que
-- "recordings select own"; para anon auth.uid() es null, así que nunca aplicaba.
drop policy if exists "recordings select own folder" on storage.objects;

-- Comprobación: debe listar 4 políticas de avatars, 3 de observer-photos y las de recordings.
select policyname, cmd, roles::text from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
