-- Revisar y ejecutar a mano en el SQL Editor de Supabase. Claude no lo ejecutó.
--
-- Campana de avisos entre usuarios.
-- Un aviso es una detección PUBLIC de otra persona; "sin leer" = creada después de
-- profiles.notifications_seen_at. No hay tabla de avisos: guardar una detección no escribe una fila
-- por cada usuario, y el estado de leído es una fecha por cuenta (igual en todos los dispositivos).

-- 1. Hasta cuándo vio cada usuario su campana. Las cuentas existentes empiezan con todo leído.
alter table public.profiles add column if not exists notifications_seen_at timestamptz;
update public.profiles set notifications_seen_at = now() where notifications_seen_at is null;
alter table public.profiles alter column notifications_seen_at set default now();

-- 2. Índice para el historial y el conteo de sin leer (públicas, de la más nueva a la más vieja).
create index if not exists detections_visibility_created_at_idx
  on public.detections (visibility, created_at desc);

-- 3. Tiempo real con Broadcast privado, no con postgres_changes: así no hace falta abrir la tabla
--    detections a lectura directa desde la API de Supabase. Al guardar una detección PUBLIC, la base
--    avisa por el canal privado "public-detections" solo el id y el dueño; la app pide el detalle a su
--    backend (que ya excluye lo propio y lo privado).
create or replace function public.broadcast_public_detection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'ownerId', new.owner_id),
    'detection-created',
    'public-detections',
    true
  );
  return new;
end;
$$;

drop trigger if exists on_public_detection_created on public.detections;
create trigger on_public_detection_created
  after insert on public.detections
  for each row
  when (new.visibility = 'PUBLIC')
  execute function public.broadcast_public_detection();

-- 4. RLS del canal: solo usuarios con sesión escuchan "public-detections", y nadie puede emitir en él
--    desde el cliente (no hay política de insert; solo el trigger, como security definer, envía).
drop policy if exists "Signed-in users receive public detection broadcasts" on realtime.messages;
create policy "Signed-in users receive public detection broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (realtime.topic() = 'public-detections' and realtime.messages.extension = 'broadcast');

-- Comprobación: debe listar el trigger y la política.
select tgname from pg_trigger where tgname = 'on_public_detection_created';
select policyname from pg_policies where schemaname = 'realtime' and tablename = 'messages';
