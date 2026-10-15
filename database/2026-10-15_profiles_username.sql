-- Revisar y ejecutar a mano en el SQL Editor de Supabase. Claude no lo ejecutó.
--
-- Nombre de usuario: solo letras y números, de 3 a 20 caracteres (mismos valores que
-- profile.username.* en el backend y environment.username en el frontend), único sin distinguir
-- mayúsculas. La app lo muestra en lugar del nombre completo.
--
-- Nota: la columna ya existe vacía en producción porque Hibernate (ddl-auto=update) la agregó al
-- correr los tests del backend contra esta base; por eso uso "if not exists". Los tests ya no
-- alteran el esquema (BackendApplicationTests usa ddl-auto=none).

-- 1. Columna.
alter table public.profiles add column if not exists username text;

-- 2. Valores para las cuentas existentes: parte del correo antes de @, en minúsculas y sin símbolos.
--    Si queda corta se completa con "observador"; se recorta a 20 y, si se repite, lleva un número.
--    Los perfiles sin cuenta en auth.users usan su display_name como semilla.
--    Resultado previsto con los datos actuales: omairalimas05@gmail.com → omairalimas05,
--    solartedaniers@gmail.com → solartedaniers.
with seeds as (
  select p.id,
         regexp_replace(lower(split_part(coalesce(u.email, p.display_name, 'observador'), '@', 1)), '[^a-z0-9]', '', 'g') as base
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.username is null or p.username = ''
), candidates as (
  select id, substr(case when length(base) < 3 then base || 'observador' else base end, 1, 20) as candidate
  from seeds
), taken as (
  select lower(username) as username from public.profiles where username is not null and username <> ''
), ranked as (
  select c.id, c.candidate,
         row_number() over (partition by c.candidate order by c.id)
           + (select count(*) from taken t where t.username = c.candidate) as n
  from candidates c
)
update public.profiles p
set username = case when r.n = 1 then r.candidate
                    else substr(r.candidate, 1, 20 - length(r.n::text)) || r.n end
from ranked r
where p.id = r.id;

-- 3. Obligatorio y único sin distinguir mayúsculas.
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- 4. Registro: el trigger que crea el perfil toma el usuario elegido en el formulario
--    (raw_user_meta_data.username). Si falta, no es válido o alguien lo tomó un instante antes,
--    genera uno libre desde el correo, así el registro nunca falla por esto.
create or replace function public.unique_username_from(seed text)
returns text
language plpgsql
set search_path = public
as $$
declare
  base text := regexp_replace(lower(split_part(coalesce(seed, 'observador'), '@', 1)), '[^a-z0-9]', '', 'g');
  candidate text;
  n int := 1;
begin
  if length(base) < 3 then base := base || 'observador'; end if;
  base := substr(base, 1, 20);
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := substr(base, 1, 20 - length(n::text)) || n;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text := new.raw_user_meta_data ->> 'username';
begin
  if chosen is null
     or chosen !~ '^[A-Za-z0-9]{3,20}$'
     or exists (select 1 from public.profiles where lower(username) = lower(chosen)) then
    chosen := public.unique_username_from(new.email);
  end if;

  insert into public.profiles (id, display_name, username, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', chosen), chosen, 'HOBBYIST')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- El trigger on_auth_user_created ya existe y apunta a esta función; lo recreo por si acaso.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- 5. Límite real de los audios en Storage (10 MB, igual que audio.upload.max-bytes del backend).
update storage.buckets set file_size_limit = 10485760 where id = 'recordings';

-- Comprobación.
select u.email, p.username from public.profiles p left join auth.users u on u.id = p.id order by p.username;
