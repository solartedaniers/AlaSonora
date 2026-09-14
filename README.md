# AlaSonora — Bioacústica & IA 🐦

Aplicación web de identificación de aves por su canto mediante inteligencia
artificial (BirdNET). El proyecto tiene tres partes, **todas implementadas y
conectadas entre sí**:

```
AlaSonora/
├── frontend/    ← Angular 19 (PWA, standalone components, signals)
├── backend/     ← Spring Boot 4 / Java 21 (API REST, JWT, JPA)
├── ai-engine/   ← FastAPI / Python (BirdNET-Analyzer, microservicio interno)
└── database/    ← PostgreSQL gestionado por Supabase (Auth + Storage + DB)
```

Flujo end-to-end: el frontend graba o sube un audio → lo sube a Supabase
Storage → llama al backend (`POST /api/detections/classify`) → el backend
descarga el audio y se lo envía al `ai-engine` → el `ai-engine` limpia el
audio, valida su calidad y ejecuta BirdNET → el backend persiste/enriquece la
especie detectada en PostgreSQL (Supabase) y devuelve el resultado al
frontend.

## Requisitos previos

| Componente | Versión probada |
|---|---|
| Node.js | ≥ 20 (probado con 22.22.2) |
| npm | ≥ 10 |
| JDK | 21 (`JAVA_HOME` debe apuntar a un JDK 21; el `java` por defecto del sistema puede ser otra versión) |
| Python | 3.11+ |
| Cuenta de Supabase | proyecto ya creado (PostgreSQL + Auth + Storage) |

Vas a necesitar las credenciales de tu proyecto de Supabase: el connection
string de Postgres, el `project ref`, y la clave "publishable" del frontend.
Se obtienen desde el dashboard de Supabase (Project Settings → Database /
API).

## 1. Base de datos (Supabase)

No hay migraciones manuales que correr: el backend usa
`spring.jpa.hibernate.ddl-auto=update`, así que Hibernate crea/actualiza las
tablas automáticamente contra tu base de Supabase la primera vez que arranca.
Solo necesitas:

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Anotar el connection string de Postgres (`Settings → Database →
   Connection string`, modo *Session pooler* recomendado).
3. Anotar la URL de tu proyecto y la clave `anon`/`publishable`
   (`Settings → API`).

## 2. Backend (Spring Boot)

```bash
cd backend
cp .env.example .env
```

Completa `backend/.env` con tus datos reales de Supabase:

```properties
DB_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres
DB_USERNAME=postgres.<tu-project-ref>
DB_PASSWORD=<tu-contraseña-de-base-de-datos>
SUPABASE_JWKS_URI=https://<tu-project-ref>.supabase.co/auth/v1/.well-known/jwks.json

# Debe coincidir con INTERNAL_API_KEY de ai-engine/.env
AI_ENGINE_API_KEY=<una-clave-compartida-cualquiera>
```

> **Importante**: `SUPABASE_JWKS_URI` debe terminar en
> `/.well-known/jwks.json` (no solo `/jwks`) — es la ruta real que expone
> Supabase para validar los JWT que llegan del frontend.

Arranque (Windows, `JAVA_HOME` debe apuntar a un JDK 21):

```bash
cd backend
./mvnw.cmd spring-boot:run
```

En Linux/macOS: `./mvnw spring-boot:run`. El backend queda escuchando en
`http://localhost:8083` (prefijo de API: `/api`).

Para solo verificar que compila sin arrancarlo: `./mvnw.cmd compile`.

### Variables de entorno opcionales del backend

Todas tienen un valor por defecto razonable en
`application.properties`; solo necesitas definirlas si quieres cambiar el
comportamiento por defecto:

| Variable | Default | Para qué sirve |
|---|---|---|
| `AI_ENGINE_BASE_URL` | `http://localhost:8000` | URL del `ai-engine` |
| `AI_ENGINE_TIMEOUT_MS` | `20000` | Timeout de la llamada HTTP al `ai-engine` |
| `AI_ENGINE_MIN_CONFIDENCE` | `0.1` | Confianza mínima de BirdNET para aceptar un candidato |
| `AI_ENGINE_MAX_RESULTS` | `3` | Máximo de especies candidatas devueltas |
| `SPECIES_TRANSLATION_TIMEOUT_MS` | `3000` | Timeout de la consulta a Wikidata para traducir nombres comunes al español |
| `MVC_ASYNC_TIMEOUT_MS` | `25000` | Timeout del endpoint asíncrono de clasificación |

## 3. Motor de IA (Python / FastAPI / BirdNET)

Es un microservicio **interno**, separado del backend: solo el backend le
habla (nunca el frontend directamente), autenticado con un header
`X-Internal-Api-Key`.

```bash
cd ai-engine
python -m venv .venv
```

Activar el entorno virtual:

```bash
# Windows (PowerShell/cmd)
.venv\Scripts\activate

# Windows (Git Bash) / Linux / macOS
source .venv/Scripts/activate   # Git Bash en Windows
source .venv/bin/activate       # Linux / macOS
```

Instalar dependencias y configurar el entorno:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Completa `ai-engine/.env`:

```properties
# Debe ser el mismo valor que AI_ENGINE_API_KEY en backend/.env
INTERNAL_API_KEY=<la-misma-clave-compartida>
DEFAULT_MIN_CONFIDENCE=0.1
DEFAULT_MAX_RESULTS=3
MAX_INFERENCE_WORKERS=2
```

Arranque:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Queda escuchando en `http://localhost:8000`. La primera petición de
clasificación puede tardar más porque BirdNET carga su modelo TensorFlow en
memoria.

### Cómo procesa el audio

Antes de correr BirdNET, cada audio pasa por dos etapas (ver
`app/audio_preprocessing.py` y `app/audio_quality.py`):

1. **Preprocesamiento** (`AudioPreprocessor`): filtro pasa-altos (elimina
   ruido de viento/manipulación por debajo de ~300 Hz) y normalización de
   pico.
2. **Control de calidad** (`AudioQualityAnalyzer`): descarta el audio antes
   de llegar a BirdNET si:
   - Es silencio o el ruido de fondo es demasiado plano/estático
     (aplanamiento espectral alto) → responde
     *"Demasiada interferencia de ruido, por favor grabe de nuevo o cargue un
     audio más limpio"*.
   - Hay energía sonora pero no en las bandas de frecuencia típicas del
     canto de aves (1-8 kHz) → responde *"No se detecta sonido de aves en la
     grabación, por favor intente nuevamente"*.

Estos umbrales son configurables por variables de entorno
(`AUDIO_HIGHPASS_CUTOFF_HZ`, `AUDIO_NOISE_FLATNESS_THRESHOLD`,
`AUDIO_BIRD_BAND_ENERGY_RATIO_THRESHOLD`) sin necesidad de tocar código.

Self-check incluido (no requiere audios de prueba, genera señales
sintéticas): `python -m app.test_audio_quality`.

## 4. Frontend (Angular)

```bash
cd frontend
npm install
```

Revisa `frontend/src/environments/environment.development.ts` y ajusta si
tu backend corre en otro puerto/host:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://<tu-project-ref>.supabase.co',
  supabasePublishableKey: '<tu-clave-publishable-de-supabase>',
  apiBaseUrl: 'http://localhost:8083/api',
};
```

Arranque:

```bash
npm start          # equivalente a `ng serve` — http://localhost:4200
```

Build de producción: `npm run build` (genera `frontend/dist/frontend`,
incluye `ngsw.json` para PWA).

## 5. Orden de arranque recomendado

Para levantar la plataforma completa localmente, en tres terminales
distintas:

1. `cd ai-engine && .venv\Scripts\activate && uvicorn app.main:app --port 8000`
2. `cd backend && ./mvnw.cmd spring-boot:run`
3. `cd frontend && npm start`

Luego abre `http://localhost:4200`.

## Nombres bilingües de especies (ES/EN)

El catálogo de especies (`backend`, entidad `Species`) guarda
`commonName` (español), `commonNameEn` (inglés) y `scientificName`. Cuando
BirdNET detecta una especie nueva que no está aún en la base de datos, el
backend la registra automáticamente y resuelve su nombre común en español
consultando [Wikidata](https://www.wikidata.org) en tiempo real por el
nombre científico (sin diccionario local ni lista de especies quemada en
código) — ver `WikidataSpeciesCommonNameTranslator`. Si Wikidata no tiene una
etiqueta en español para esa especie, se usa el nombre en inglés como
respaldo. El frontend muestra el nombre correspondiente al idioma activo con
fallback ES → EN → nombre científico (`speciesDisplayName` en
`core/models/species.model.ts`).

## Stack técnico

- **Frontend**: Angular 19 (standalone components, signals), Tailwind CSS 3,
  i18n propio, 3 Web Workers (espectrograma, sincronización entre pestañas,
  service worker/PWA), IndexedDB para cola offline.
- **Backend**: Spring Boot 4.1.1 / Java 21, Spring Data JPA, Spring Security
  (OAuth2 resource server validando JWT de Supabase con ES256), ejecución
  asíncrona de la clasificación en un `Executor` dedicado (bulkhead,
  aislado de los hilos HTTP de Tomcat).
- **AI Engine**: FastAPI + `birdnetlib` (BirdNET-Analyzer), preprocesamiento
  de audio con `librosa`/`scipy`/`soundfile`.
- **Base de datos**: PostgreSQL gestionado por Supabase (también provee Auth
  y Storage de audios).

## Estructura del frontend

```
frontend/src/app/
├── core/                 # singletons de toda la app
│   ├── services/         # ThemeService, I18nService, AudioCaptureService, LiveSyncService, OfflineStorageService, servicios HTTP reales
│   ├── models/            # Species, Detection, AppUser, NetworkStats
│   ├── guards/
│   └── interceptors/
├── features/               # una carpeta por pantalla
│   ├── landing/
│   ├── auth/login/ auth/register/
│   ├── dashboard/
│   ├── recording/
│   ├── result/
│   ├── history/
│   ├── map/
│   └── profile/
├── shared/
│   ├── components/          # theme-toggle, lang-toggle, nav-header, confidence-badge, spectrogram-view, offline-banner
│   └── pipes/                 # translate.pipe.ts, species-name.pipe.ts
├── workers/                    # los 3 Web Workers + contratos de mensajes tipados
└── theme/                       # tokens.scss (colores) + typography.scss
```

## Estructura del backend

```
backend/src/main/java/com/alasonora/backend/
├── ai/            # puerto BirdSoundClassifier + adaptador HTTP al ai-engine
├── async/         # configuración del executor dedicado a clasificación
├── config/        # *Properties tipadas (AiProperties, CorsProperties, SpeciesTranslationProperties, ...)
├── controller/    # endpoints REST
├── dto/           # contratos de entrada/salida de la API
├── entity/        # entidades JPA
├── repository/    # Spring Data JPA
├── service/       # lógica de negocio (SpeciesService, DetectionClassificationService, ...)
└── translation/   # SpeciesCommonNameTranslator + implementación vía Wikidata
```

## Estructura del ai-engine

```
ai-engine/app/
├── main.py                 # endpoints FastAPI
├── classifier.py           # orquesta preprocesamiento + control de calidad + BirdNET
├── audio_preprocessing.py  # filtro pasa-altos + normalización
├── audio_quality.py        # detección de ruido excesivo / ausencia de canto de ave
├── config.py                # configuración vía variables de entorno (pydantic-settings)
├── schemas.py                # modelos Pydantic de request/response
└── test_audio_quality.py     # self-check con señales sintéticas
```
