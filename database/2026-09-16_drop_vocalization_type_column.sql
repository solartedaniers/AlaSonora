-- Review and run manually in the Supabase SQL Editor. Not executed by Claude.
--
-- El campo vocalizationType se eliminó del backend/frontend (entidad, DTO,
-- UI, i18n) porque no había ningún camino en la app que lo poblara con un
-- valor real: siempre quedaba en 'UNKNOWN'. Hibernate (ddl-auto=update)
-- nunca elimina columnas por su cuenta, así que la columna y su CHECK
-- constraint siguen en la tabla real hasta que se borren manualmente.
alter table species drop constraint if exists species_vocalization_type_check;
alter table species drop column if exists vocalization_type;
