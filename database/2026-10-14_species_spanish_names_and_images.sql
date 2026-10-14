-- Revisar y ejecutar a mano en el SQL Editor de Supabase. Claude no lo ejecutó.
--
-- 1. Nombres en español para las especies guardadas con el nombre en inglés en common_name
--    (consultado el 2026-10-14). Fuente: Wikidata (propiedad P1843 "taxon common name" en español,
--    o su etiqueta en español cuando no es el nombre científico). Las marcadas "verificar" no tienen
--    nombre en español en Wikidata; uso el nombre estándar en castellano (SEO/BirdLife, De Juana et al.)
--    y conviene revisarlas antes de correr el script.
--    Solo actualiza filas que siguen con el nombre en inglés: nunca pisa un nombre ya corregido.
--
--    actual                      → nuevo                     fuente
--    Saffron Finch               → Chirigüe azafranado       Wikidata P1843
--    Yellow-backed Oriole        → Turpial dorsidorado       Wikidata P1843
--    Tawny Antpitta              → Tororoí leonado           Wikidata P1843
--    Striped Cuckoo              → Crespín                   SEO/BirdLife (verificar)
--    Western Capercaillie        → Urogallo común            Wikidata P1843
--    White-winged Dove           → Zenaida aliblanca         Wikidata P1843
--    European Turtle-Dove        → Tórtola europea           Wikidata (etiqueta es)
--    Houston Toad                → Sapo de Houston           traducción descriptiva; es un anfibio (verificar)
--    Ruddy Shelduck              → Tarro canelo              Wikidata (etiqueta es)
--    Wild Turkey                 → Guajolote norteño         Avibase/IOC en español (verificar)
--    Whooper Swan                → Cisne cantor              SEO/BirdLife (verificar)
--    Speckled Tinkerbird         → Barbudito escolopáceo     Wikidata P1843

update species as s
set common_name = v.spanish
from (values
  ('Sicalis flaveola',        'Chirigüe azafranado'),
  ('Icterus chrysater',       'Turpial dorsidorado'),
  ('Grallaria quitensis',     'Tororoí leonado'),
  ('Tapera naevia',           'Crespín'),
  ('Tetrao urogallus',        'Urogallo común'),
  ('Zenaida asiatica',        'Zenaida aliblanca'),
  ('Streptopelia turtur',     'Tórtola europea'),
  ('Anaxyrus houstonensis',   'Sapo de Houston'),
  ('Tadorna ferruginea',      'Tarro canelo'),
  ('Meleagris gallopavo',     'Guajolote norteño'),
  ('Cygnus cygnus',           'Cisne cantor'),
  ('Pogoniulus scolopaceus',  'Barbudito escolopáceo')
) as v(scientific_name, spanish)
where s.scientific_name = v.scientific_name
  and s.common_name = s.common_name_en;

-- 2. Imágenes: 5 especies guardaron una ruta de placeholder del frontend que ya no existe
--    (/images/bird-silhouette-default.svg), por eso la foto salía rota. Sin foto real, la dejo en null:
--    el frontend muestra su ilustración con el aviso "Imagen de la especie no encontrada".
update species
set image_url = null
where image_url in ('/images/bird-silhouette-default.svg', '/images/sketch.webp');

-- Comprobación: ninguna fila debería quedar con common_name igual al inglés ni con ruta de placeholder.
select id, scientific_name, common_name, common_name_en, image_url
from species
where common_name = common_name_en
   or image_url like '/images/%'
order by id;
