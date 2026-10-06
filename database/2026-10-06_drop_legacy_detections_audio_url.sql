-- Review and run manually in the Supabase SQL Editor. Not executed by Claude.
--
-- detections.audio_url es una columna heredada de antes de que el backend
-- guardara solo el path del bucket (audio_storage_path) y firmara la URL en
-- cada request. Ya no existe en la entidad, pero Hibernate (ddl-auto=update)
-- nunca borra columnas, así que sigue en la tabla real — y la auditoría del
-- 2026-10-06 encontró 1 fila (id 8) con una URL FIRMADA persistida (ya
-- expirada) y audio_storage_path en null, así que esa detección no tiene
-- audio reproducible. El objeto sigue existiendo en el bucket "recordings".
--
-- 1) Recupera el path desde la URL firmada, solo si el objeto existe de
--    verdad en el bucket.
update detections d
set audio_storage_path = substring(d.audio_url from '/object/sign/recordings/([^?]+)')
where d.audio_storage_path is null
  and d.audio_url is not null
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'recordings'
      and o.name = substring(d.audio_url from '/object/sign/recordings/([^?]+)')
  );

-- 2) Borra la columna: ya nada la lee ni la escribe.
alter table detections drop column if exists audio_url;
