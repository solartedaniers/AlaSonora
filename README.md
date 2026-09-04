# AlaSonora — Bioacústica & IA 🐦

Aplicación web de identificación de aves por su canto mediante inteligencia
artificial (BirdNET). Este repositorio contiene **las tres partes del
proyecto** (frontend, backend, base de datos), aunque en esta fase **solo el
frontend está implementado**. Backend y base de datos se abordan en fases
posteriores.

## Estructura del repositorio

```
AlaSonora/
├── .gitignore          ← único para todo el proyecto
├── README.md            ← este archivo
├── frontend/             ← Angular + Tailwind (completo, esta fase)
├── backend/              ← FastAPI + BirdNET-Analyzer (fase posterior, vacío)
└── database/             ← PostgreSQL / Supabase (fase posterior, vacío)
```

Cuando lleguemos a la fase de backend se creará un único archivo `.env` en
la raíz del proyecto (no uno por carpeta), con las variables compartidas
por frontend y backend.

## Stack del frontend

- **Angular 19** (standalone components, signals, lazy loading por feature)
  — nota: el brief original pedía la versión estable más reciente
  (Angular 22 al momento de escribir esto), pero el entorno de build
  disponible usa Node 22.22.2 y Angular 22 requiere Node ≥22.22.3. Angular 19
  es totalmente compatible con la arquitectura del proyecto (standalone,
  signals). **Recomendación**: en tu máquina, si tienes Node ≥22.22.3 o
  ≥24.15.0, puedes actualizar con
  `ng update @angular/core@22 @angular/cli@22` sin cambios de arquitectura.
- **Tailwind CSS 3**, con todos los colores, tipografías y espaciados
  mapeados a variables CSS (`src/app/theme/tokens.scss`) — cero valores
  sueltos en componentes.
- **i18n propio** (sin librería externa): `public/i18n/es.json` y
  `public/i18n/en.json`, cargados en tiempo de ejecución por `I18nService` y
  consumidos vía el pipe `translate`.
- **3 Web Workers**:
  - `audio-processing.worker.ts` — Web Worker dedicado: calcula el
    espectrograma (FFT) de los fragmentos de audio capturados, sin acceso al
    DOM.
  - `sync.worker.ts` — Shared Worker: sincroniza el estado de "detecciones en
    vivo" entre pestañas del mismo usuario (ej. dashboard + mapa público
    abiertos a la vez).
  - Service Worker (`@angular/service-worker`, configurado en
    `ngsw-config.json`) — cachea assets para funcionar como PWA instalable y
    permite operar sin conexión.
  - Todos los mensajes entre hilos están tipados en `src/app/workers/messages.ts`.
- **IndexedDB** (`OfflineStorageService`) para encolar grabaciones hechas sin
  conexión, pendientes de sincronizar.
- **Servicios mock** (`core/services/*`) con datos de ejemplo, pero con la
  misma interfaz async que tendrán los servicios reales conectados a la API
  FastAPI — reemplazarlos en la fase de backend no debería requerir tocar
  los componentes que los consumen.

## Requisitos

- Node.js ≥ 20 (probado con Node 22.22.2)
- npm ≥ 10

## Instalación y ejecución

```bash
cd frontend
npm install
npm start          # equivalente a `ng serve` — http://localhost:4200
```

### Build de producción

```bash
cd frontend
npm run build       # genera frontend/dist/frontend, incluyendo ngsw.json (PWA)
```

> **Nota sobre fuentes en build de producción**: la optimización de Angular
> intenta *inlinear* las fuentes de Google Fonts descargándolas en build
> time. Si tu entorno de CI/CD no tiene salida a `fonts.googleapis.com`, el
> build fallará. Esto ya está desactivado en `angular.json`
> (`optimization.fonts: false`); si prefieres el inlining, cambia ese valor
> a `true` en un entorno con acceso a internet completo.

## Estructura del frontend

```
frontend/src/app/
├── core/                 # singletons de toda la app
│   ├── services/         # ThemeService, I18nService, servicios mock, AudioCaptureService, LiveSyncService, OfflineStorageService
│   ├── models/            # Species, Detection, AppUser, NetworkStats
│   ├── guards/             # (vacío por ahora)
│   └── interceptors/       # (vacío por ahora)
├── features/               # una carpeta por pantalla
│   ├── landing/
│   ├── auth/login/ auth/register/
│   ├── dashboard/
│   ├── recording/
│   ├── result/
│   ├── history/            # con toggle de vista galería/lista
│   ├── map/
│   └── profile/             # versión extendida (incluye configuración)
├── shared/
│   ├── components/          # theme-toggle, lang-toggle, nav-header, confidence-badge, spectrogram-view, offline-banner
│   └── pipes/                 # translate.pipe.ts
├── workers/                    # los 3 Web Workers + contratos de mensajes tipados
└── theme/                       # tokens.scss (colores) + typography.scss
```

## Arquitectura y decisiones de diseño

- **Patrón de servicios**: la lógica de negocio y acceso a datos vive en
  `core/services`, nunca en los componentes — los componentes solo orquestan
  UI e inyectan servicios (inyección de dependencias nativa de Angular).
- **SRP**: cada servicio tiene una responsabilidad — `AudioCaptureService`
  solo captura y delega al worker, `SpectrogramViewComponent` solo pinta,
  `OfflineStorageService` solo persiste en IndexedDB, etc.
- **Signals** como fuente de verdad reactiva en toda la app (tema, idioma,
  grabación en curso, resultados) — evita la complejidad de RxJS para estado
  simple, y se integra de forma nativa con la detección de cambios de
  Angular.
- **Microtasks vs. tasks**: documentado extensamente en
  `core/services/audio-capture.service.ts` y
  `shared/components/spectrogram-view/spectrogram-view.component.ts` — la
  recepción de frames de audio del Web Worker se resuelve en microtasks
  (rápidas, alta frecuencia) mientras que el pintado del espectrograma se
  agenda explícitamente vía `requestAnimationFrame` (tasks, ~60fps), para
  que el hilo principal nunca se bloquee sin importar cuántos frames de
  audio lleguen entre repintados.

## Próxima fase (no incluida aún)

- `backend/`: FastAPI sirviendo BirdNET-Analyzer preentrenado.
- `database/`: PostgreSQL vía Supabase (+ Storage para audio, Auth).
- Sustituir los servicios mock (`core/services/*`) por llamadas HTTP reales
  manteniendo la misma interfaz pública.
- `.env` único en la raíz del proyecto con las variables de ambos lados.
