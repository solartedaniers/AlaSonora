# 🐦 AlaSonora

**Identifica aves por su canto, directamente desde el navegador.**

AlaSonora es una aplicación web progresiva (PWA) que permite a cualquier persona —biólogos de campo, guardaparques o ciudadanos curiosos— grabar el sonido ambiente donde se encuentran y descubrir, gracias a inteligencia artificial, qué especies de aves están cantando alrededor, sin necesidad de verlas ni fotografiarlas. Cada grabación queda guardada en un historial geolocalizado, construyendo con el tiempo un registro útil para ciencia ciudadana y monitoreo de biodiversidad.

> 📍 Proyecto de grado — 7° semestre de Ingeniería de Software, Universidad Cooperativa de Colombia.

---

## 📑 Tabla de contenido

1. [¿Qué es AlaSonora?](#-qué-es-alasonora)
2. [¿Cómo funciona? (flujo end-to-end)](#-cómo-funciona-flujo-end-to-end)
3. [Arquitectura general](#-arquitectura-general)
4. [Stack tecnológico](#-stack-tecnológico)
5. [Modelos de IA utilizados](#-modelos-de-ia-utilizados)
6. [Event Loop: Tasks vs Microtasks](#-event-loop-tasks-vs-microtasks)
7. [Web Workers](#-web-workers-service-worker-shared-worker)
8. [Patrones de diseño aplicados](#-patrones-de-diseño-aplicados)
9. [Base de datos](#-base-de-datos)
10. [Despliegue planeado](#-despliegue-planeado)
11. [Cómo correr el proyecto](#-cómo-correr-el-proyecto)
12. [Cómo correr los tests](#-cómo-correr-los-tests)
13. [Estructura de carpetas](#-estructura-de-carpetas)

---

## 🌎 ¿Qué es AlaSonora?

No es "otra app de IA". Es una herramienta de campo pensada para el mundo real:

- 🎙️ **Grabás el ambiente** desde el micrófono del celular o tablet, en el punto exacto donde estás parado.
- 🧠 **La IA identifica la especie** que está cantando (o varias, si hay más de un ave), con un nivel de confianza.
- 📊 **Ves el resultado** al instante: nombre de la especie, espectrograma del audio y porcentaje de confianza.
- 🗺️ **Queda guardado** en tu historial personal, con fecha, hora y ubicación aproximada — un registro que crece con cada salida al campo.
- 📶 **Funciona sin señal**: podés grabar en una reserva sin cobertura y la app sincroniza todo automáticamente cuando volvés a tener internet.
- 👥 **Ciencia colaborativa**: si varios observadores están en la misma zona, pueden ver en un panel compartido, en tiempo real, qué está detectando cada uno.

En otras palabras: AlaSonora convierte el celular de cualquier persona en un asistente de identificación de aves por sonido, y transforma esas identificaciones individuales en un mapa colectivo de biodiversidad.

---

## 🔄 ¿Cómo funciona? (flujo end-to-end)

```
🎙️ Grabar audio          📊 Procesar localmente        🧠 Identificar con IA         💾 Guardar y compartir
   (navegador)      →      (espectrograma, Web       →   (backend → BirdNET)     →    (historial geolocalizado
                            Worker dedicado)                                            + panel en tiempo real)
```

1. El usuario abre AlaSonora en su celular y presiona grabar.
2. El navegador captura audio con la Web Audio API (`AudioCaptureService`), aplicando una cadena real de procesamiento: ganancia (`GainNode`), filtro pasa-altos (`BiquadFilterNode`) y un limitador (`DynamicsCompressorNode`) que evita que el audio se sature.
3. En paralelo, un **Web Worker dedicado** calcula la FFT y dibuja el espectrograma sin bloquear la interfaz.
4. El audio se envía al backend (Spring Boot), que lo reenvía internamente al microservicio de IA (FastAPI + BirdNET).
5. BirdNET devuelve la(s) especie(s) candidata(s) con su confianza; el backend filtra falsos positivos (ruido, motores, voces humanas, etc.) y enriquece la especie (nombre en español, imagen, referencia de canto) si es la primera vez que se detecta.
6. El resultado se muestra en pantalla y se guarda en el historial del usuario, con geolocalización aproximada.
7. Si el usuario marcó la detección como pública, aparece en tiempo real en el panel compartido de todos los observadores conectados (Supabase Realtime).
8. Si no hay internet en el momento de grabar, la grabación queda en cola local (IndexedDB) y se procesa automáticamente apenas vuelve la conexión (Service Worker + Background Sync).

---

## 🏗️ Arquitectura general

AlaSonora sigue una arquitectura de **8 capas lógicas**, pero solo **3 son aplicaciones físicas separadas**. Las capas 2 a 5 conviven dentro de un único backend Spring Boot (siguiendo buenas prácticas de separación de responsabilidades por paquete), no son microservicios independientes.

| # | Capa | ¿Qué hace? | ¿Dónde vive? |
|---|------|------------|---------------|
| 1 | **Client** | UI, captura de audio, espectrograma, PWA offline | `frontend/` (Angular) — app física separada |
| 2 | **Edge / Security** | Autenticación, validación de JWT, CORS, rate limiting | Paquete `config` / `security` dentro del backend |
| 3 | **Application** | Controladores REST, DTOs, orquestación de casos de uso | Paquete `controller` / `dto` dentro del backend |
| 4 | **Domain** | Entidades, reglas de negocio, servicios de dominio | Paquete `entity` / `service` dentro del backend |
| 5 | **Async** | Tareas en segundo plano (enriquecimiento de especie en paralelo, llamadas a IA sin bloquear hilos web) | Paquete `async` (executors dedicados) dentro del backend |
| 6 | **AI** | Clasificación de audio (BirdNET) y de foto (EfficientNetB2) | `ai-engine/` (Python/FastAPI) — app física separada |
| 7 | **Data** | Persistencia, almacenamiento de archivos, autenticación de usuarios | Supabase (Postgres + Auth + Storage + Realtime) — servicio administrado |
| 8 | **DevOps** | CI/CD, despliegue, monitoreo | GitHub Actions + capas gratuitas de hosting |

**¿Por qué separar el backend de Spring Boot del `ai-engine` en Python?**
Porque BirdNET-Analyzer es una librería de Python (`birdnetlib`), no existe una versión nativa para Java. En vez de forzar una integración vía JNI o reimplementar el modelo, se expone como un microservicio HTTP interno, autenticado con una API key privada (`X-Internal-Api-Key`) que **nunca es alcanzable directamente desde el navegador** — todo pasa por el backend, que actúa como *gateway* de confianza.

---

## 🧰 Stack tecnológico

### Frontend — `frontend/`

| Tecnología | ¿Para qué se usa? |
|---|---|
| **Angular 19** (standalone components + Signals) | Framework principal de la SPA/PWA; Signals para estado reactivo sin RxJS de más |
| **TypeScript** | Tipado estático en todo el cliente |
| **Tailwind CSS 3** | Estilos utilitarios; combinado con un sistema de *design tokens* propio (`theme/tokens.scss`) para no hardcodear colores |
| **Reactive Forms** | Formularios de login, registro, perfil y detección con validación |
| **i18n propio** (`public/i18n/es.json`, `en.json` + `TranslatePipe`) | Cero texto hardcodeado en las plantillas; soporte multi-idioma desde el día uno |
| **Web Audio API** | Captura y procesamiento real de audio (ganancia, filtro, compresión) |
| **Leaflet + OpenStreetMap** | Mapa público de detecciones (gratuito, sin necesidad de tarjeta de crédito, a diferencia de Google Maps) |
| **@angular/service-worker** | Soporte PWA, caché offline, sincronización diferida |
| **Supabase JS client** | Autenticación de usuario y suscripción a canales Realtime |

### Backend — `backend/`

| Tecnología | ¿Para qué se usa? |
|---|---|
| **Spring Boot 4.1.1** (Java 21) | API REST principal, orquestación de todo el flujo de negocio |
| **Spring Data JPA / Hibernate** | Persistencia de entidades sobre Postgres |
| **Spring Security — OAuth2 Resource Server** | Valida los JWT emitidos por Supabase Auth (algoritmo ES256) contra su JWKS público; el backend nunca emite ni gestiona contraseñas |
| **Maven** | Gestión de dependencias y build |
| **Lombok** | Reduce *boilerplate* en entidades y DTOs |
| **CompletableFuture + Executors dedicados** | Paraleliza llamadas externas lentas (traducción, imagen, referencia de canto) y aísla las llamadas a IA del pool de hilos web (patrón *Bulkhead*) |

### AI Engine — `ai-engine/`

| Tecnología | ¿Para qué se usa? |
|---|---|
| **Python 3 + FastAPI** | Expone el modelo de IA como microservicio HTTP interno |
| **birdnetlib** | Wrapper de BirdNET-Analyzer (Cornell Lab of Ornithology) para clasificación de audio |
| **librosa / soundfile / scipy / resampy** | Preprocesamiento de audio (resampleo, control de calidad, extracción de espectro) |
| **Hugging Face Transformers** (`dennisjooo/Birds-Classifier-EfficientNetB2`) | Clasificación de aves a partir de **fotos** (feature adicional, independiente del flujo de audio) |

### Infraestructura — Base de datos y servicios

| Tecnología | ¿Para qué se usa? |
|---|---|
| **Supabase (Postgres)** | Base de datos relacional principal |
| **Supabase Auth** | Registro, login, recuperación de contraseña, emisión de JWT |
| **Supabase Storage** | Almacenamiento de archivos: avatares (público), grabaciones y fotos de observadores (privados, con URLs firmadas) |
| **Supabase Realtime** | Notificaciones en vivo del panel colaborativo (`postgres_changes` filtrado por detecciones públicas) |

---

## 🧠 Modelos de IA utilizados

### 1. BirdNET (Cornell Lab of Ornithology) — identificación por audio

Es el motor central de la aplicación.

- **¿Qué hace?** Recibe un fragmento de audio y devuelve una lista de especies candidatas con su nivel de confianza, analizando el espectro de frecuencias del canto.
- **¿Por qué este modelo y no otro?**
  - Es **el estándar de facto** en bioacústica de aves: entrenado con millones de grabaciones etiquetadas por expertos de todo el mundo (proyecto de Cornell Lab + Chemnitz University).
  - Cubre **miles de especies** con soporte geográfico (permite filtrar por región/fecha para mejorar la precisión, de forma opcional).
  - Existe como librería (`birdnetlib`) lista para producción, evitando entrenar un modelo desde cero — algo que además el alcance del proyecto no requiere ni sería responsable intentar sin el dataset ni el poder de cómputo de Cornell.
  - Es open-source y gratuito para uso no comercial/académico.
- **Filtrado adicional propio:** BirdNET también reconoce sonidos que no son aves (perros, motores, voces humanas, sirenas, etc.). AlaSonora filtra esas etiquetas (`NON_EVENT_LABELS`) para que nunca aparezcan como "especie detectada".

### 2. EfficientNetB2 para clasificación por foto (feature complementaria)

- **Modelo:** `dennisjooo/Birds-Classifier-EfficientNetB2` (Hugging Face, licencia Apache 2.0), cubre 525 especies.
- **¿Por qué?** Es un modelo ligero, ya entrenado, con buena relación precisión/velocidad para clasificación de imágenes, ideal para una funcionalidad exploratoria adicional ("identificar por foto") que **no reemplaza** el flujo principal por audio, sino que lo complementa para el caso en que el usuario sí llegó a fotografiar el ave.
- Es un flujo **independiente**: no persiste en el historial de detecciones por audio (decisión de producto para mantener la coherencia del registro geolocalizado principal).

> ⚠️ En ningún caso se entrena un modelo desde cero: ambos modelos se usan **ya entrenados**, tal como lo pide el alcance del proyecto.

---

## ⚙️ Event Loop: Tasks vs Microtasks

AlaSonora aplica esta distinción de forma consciente en el flujo de captura y visualización de audio, dentro de `AudioCaptureService` y `SpectrogramViewComponent`:

| Mecanismo | Tipo | ¿Dónde se usa? | ¿Por qué importa? |
|---|---|---|---|
| **Resolución de mensajes del Web Worker** (`postMessage` / `onmessage`, y las `Promise` que envuelven la comunicación con el worker) | **Microtask** | Al recibir los datos de FFT calculados por el worker de audio | Las microtareas se ejecutan **antes** de que el navegador pinte el siguiente frame, apenas se vacía la pila de llamadas — así los datos del espectrograma están listos lo antes posible |
| **`requestAnimationFrame`** para dibujar el espectrograma en el `<canvas>` | **Task** (más precisamente, se sincroniza con el ciclo de repintado del navegador) | En `SpectrogramViewComponent`, al recibir los datos ya procesados | Desacopla el *cálculo* (microtask, rápido) del *pintado visual* (tarea sincronizada con la tasa de refresco), evitando bloquear el hilo principal y logrando una animación fluida |
| **Llamadas HTTP** (`fetch` a través de `HttpClient`) hacia el backend | **Macrotask** (I/O) | Envío del audio grabado para clasificación | Es trabajo asíncrono de red; Angular gestiona su resolución fuera del hilo de renderizado |

**En resumen:** el worker resuelve los datos vía microtareas (rápido, antes del próximo repintado), pero el dibujo real en pantalla se deja para una `task` sincronizada con `requestAnimationFrame`, evitando que cálculos pesados compitan con la interactividad de la UI.

---

## 🧵 Web Workers, Service Worker, Shared Worker

Los tres tipos de *worker* se usan en AlaSonora, cada uno para el problema que realmente resuelve — no por usarlos todos, sino porque cada uno cubre una necesidad distinta del proyecto:

| Tipo | ¿Qué es? | ¿Dónde se usa en AlaSonora? | ¿Por qué ese y no otro? |
|---|---|---|---|
| **Web Worker (dedicado)** | Un hilo en segundo plano exclusivo de **una sola pestaña/instancia**, ideal para cálculo puro sin acceso al DOM | `audio-processing.worker.ts` — calcula la FFT del audio capturado para generar el espectrograma | El cálculo de FFT es intensivo en CPU; si se hiciera en el hilo principal, congelaría la interfaz mientras el usuario graba. Al ser un dato que solo le importa a *esa* pestaña, no se necesita compartirlo entre pestañas |
| **Shared Worker** | Un único hilo compartido entre **varias pestañas/instancias del mismo origen** | `sync.worker.ts` — mantiene sincronizado el estado de detecciones en vivo si el usuario tiene AlaSonora abierta en varias pestañas | Si el usuario (o varios observadores en el mismo dispositivo) tiene la app abierta en más de una pestaña, todas deben reflejar las mismas detecciones sin duplicar conexiones al canal de Realtime — un Shared Worker evita abrir una suscripción por pestaña |
| **Service Worker** | Un *proxy* de red que vive incluso cuando la app está cerrada, con control total sobre las peticiones (caché, offline, sincronización diferida) | `@angular/service-worker` — habilita la PWA: caché de assets, funcionamiento offline y sincronización de grabaciones pendientes cuando vuelve la señal | Es el único mecanismo capaz de interceptar peticiones de red y sobrevivir sin conexión — imprescindible para el requisito de "grabar en campo sin señal y sincronizar después" |

**Nota académica:** aunque el proyecto es una aplicación web que en última instancia necesita conexión para procesar el audio con IA (el modelo corre en el backend, no en el navegador), el Service Worker permite **diferir** esa necesidad de conexión — el usuario puede seguir grabando sin señal y la sincronización ocurre automáticamente apenas el dispositivo recupera internet, que es exactamente el escenario real de trabajo de campo (reservas naturales, zonas rurales).

---

## 🎨 Patrones de diseño aplicados

| Patrón | ¿Dónde? | ¿Por qué se usó? |
|---|---|---|
| **Repository** | Spring Data JPA (`SpeciesRepository`, `DetectionRepository`, etc.) | Separa el acceso a datos de la lógica de negocio; permite cambiar la fuente de datos sin tocar los servicios |
| **DTO (Data Transfer Object)** | `record`s en el paquete `dto` | Nunca se expone una `@Entity` directamente por HTTP, evitando fugas de datos internos y acoplamiento entre la API pública y el modelo de persistencia |
| **Port / Adapter (Hexagonal)** | `BirdSoundClassifier` → `BirdNetHttpClassifier`, `BirdPhotoClassifier` → `BirdPhotoHttpClassifier`, `SpeciesImageResolver` → `WikimediaCommonsSpeciesImageResolver`, `SpeciesCommonNameTranslator` → `WikidataSpeciesCommonNameTranslator`, `SpeciesVocalizationReferenceResolver` → `XenoCantoVocalizationReferenceResolver`, `PrivateObjectSignedUrlResolver` → `SupabasePrivateObjectSignedUrlResolver` | El dominio depende de interfaces, no de implementaciones concretas de servicios externos (BirdNET, Wikidata, Wikimedia, Xeno-canto, Supabase Storage) — si mañana cambia el proveedor, solo se reemplaza el adaptador |
| **Singleton** | Servicios Angular (`providedIn: 'root'`) y *beans* de Spring | Una única instancia compartida de servicios sin estado propio de un componente (autenticación, cliente HTTP, etc.) |
| **Observer / reactivo** | Angular Signals + `effect()` | La UI reacciona automáticamente a cambios de estado sin suscripciones manuales que gestionar |
| **Interceptor** | `authInterceptor` (Angular) | Inyecta el token JWT en cada petición saliente de forma transversal, sin repetir lógica en cada servicio |
| **Guard** | `authGuard` (Angular Router) | Protege rutas que requieren sesión iniciada, centralizando la regla de acceso |
| **Bulkhead** | `aiTaskExecutor` (executor dedicado en el backend) | Aísla las llamadas al microservicio de IA en su propio pool de hilos, para que una IA lenta o caída no agote los hilos que atienden al resto de la API |

---

## 🗄️ Base de datos

**Motor:** PostgreSQL, administrado por **Supabase**.

### Tablas principales

| Tabla | Contenido |
|---|---|
| `species` | Catálogo de especies detectadas: nombre científico, nombre común (traducido), imagen de referencia, estado de conservación IUCN, referencia de canto |
| `detections` | Cada grabación identificada: usuario, especie principal, confianza, ubicación (lat/lon), fecha/hora, URL del audio, espectrograma, visibilidad (`PRIVATE` / `PUBLIC`) |
| `detection_candidates` | Especies alternativas sugeridas por BirdNET para una misma grabación, con su confianza individual |
| `profiles` | Datos extendidos del usuario (nombre, avatar), vinculados 1:1 a un usuario de Supabase Auth vía trigger |

### Decisiones de diseño relevantes

- **`ddl-auto=update` (Hibernate):** el esquema se genera y actualiza automáticamente a partir de las entidades Java. No se usa Flyway/Liquibase por el alcance académico del proyecto — limitación conocida y aceptada: los cambios de esquema en producción requerirían una migración más controlada en un contexto real.
- **Row Level Security (RLS):** habilitado en Supabase; las políticas controlan qué filas puede leer/escribir cada usuario (por ejemplo, un usuario solo puede editar sus propias detecciones; las públicas son visibles para todos).
- **Columnas de texto libre/URLs** (`@Column(columnDefinition = "TEXT")`): se usa `TEXT` en vez del `VARCHAR(255)` por defecto de Hibernate, para no truncar URLs largas de imágenes o referencias externas.
- **`iucn_status`** (estado de conservación): enum con 9 valores (`LC`, `NT`, `VU`, `EN`, `CR`, `DD`, `NE`, `EW`, `EX`), validado a nivel de aplicación (Java), sin `CHECK` constraint a nivel de base de datos — decisión consciente para simplificar el manejo de nuevos valores durante el desarrollo.
- **Almacenamiento de archivos (Supabase Storage):**
  - `avatars` → bucket público.
  - `recordings` y `observer-photos` → buckets privados, accedidos mediante **URLs firmadas generadas bajo demanda** (TTL corto, ~120s) en cada solicitud, en vez de guardar una URL firmada fija que terminaría expirando.
- **Realtime:** canal `postgres_changes` suscrito a la tabla `detections`, filtrado por `visibility = eq.PUBLIC`, para alimentar el panel colaborativo en vivo.

---

## ☁️ Despliegue planeado

Toda la infraestructura está pensada para correr en **capas gratuitas**, apropiado para un proyecto académico sin presupuesto de infraestructura.

| Componente | Plataforma planeada | Motivo |
|---|---|---|
| **Frontend (Angular PWA)** | Vercel / Netlify (capa gratuita) | Despliegue continuo desde GitHub, CDN global, HTTPS automático, ideal para SPA/PWA estáticas |
| **Backend (Spring Boot)** | Render / Railway (capa gratuita) | Soporta contenedores Java sin costo para tráfico bajo/moderado, con despliegue automático desde GitHub |
| **AI Engine (FastAPI + BirdNET)** | Render / Hugging Face Spaces (capa gratuita) | Ambas ofrecen entornos Python listos para servir modelos, con soporte de contenedores |
| **Base de datos, Auth, Storage, Realtime** | Supabase (capa gratuita) | Todo-en-uno administrado, evita levantar y mantener infraestructura propia de Postgres |
| **CI/CD** | GitHub Actions | Build y verificación automática en cada push, gratuito para repositorios de este tamaño |

---

## 🚀 Cómo correr el proyecto

### Requisitos previos

- **Java 21** y **Maven** (o usar el wrapper `./mvnw` incluido)
- **Node.js** (versión compatible con Angular 19) y **npm**
- **Python 3.10+** y **pip**
- Una cuenta de **Supabase** con un proyecto creado (URL + claves de API)

### 1️⃣ Backend (Spring Boot)

```bash
cd backend

# Crear un archivo .env en la raíz de backend/ con, por ejemplo:
# DB_URL=jdbc:postgresql://<host-supabase>:5432/postgres
# DB_USERNAME=postgres
# DB_PASSWORD=<tu-password>
# SUPABASE_JWKS_URI=https://<tu-proyecto>.supabase.co/auth/v1/.well-known/jwks.json
# AI_ENGINE_URL=http://localhost:8000
# AI_ENGINE_API_KEY=<clave-interna-compartida-con-ai-engine>

./mvnw spring-boot:run
```

El backend queda disponible en `http://localhost:8083` (puerto configurado en `application.properties`).

### 2️⃣ AI Engine (FastAPI + BirdNET)

```bash
cd ai-engine

python -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate

pip install -r requirements.txt

# Crear un archivo .env con, por ejemplo:
# INTERNAL_API_KEY=<misma-clave-que-AI_ENGINE_API_KEY-del-backend>

uvicorn app.main:app --reload --port 8000
```

### 3️⃣ Frontend (Angular)

```bash
cd frontend

npm install

# Configurar environment.ts con la URL del backend y las claves públicas de Supabase

ng serve
```

La app queda disponible en `http://localhost:4200`.

> 💡 Orden recomendado para levantar todo en desarrollo: **1) ai-engine → 2) backend → 3) frontend**, ya que el backend depende del ai-engine para clasificar, y el frontend depende del backend para todo.

---

## 🧪 Cómo correr los tests

### Backend

```bash
cd backend
./mvnw test
```

### AI Engine

```bash
cd ai-engine
source venv/bin/activate
pytest
```

### Frontend

```bash
cd frontend
ng test
```

---

## 📁 Estructura de carpetas

```
AlaSonora/
├── frontend/          # Angular 19 + Tailwind — PWA cliente
├── backend/           # Spring Boot 4.1.1 — API REST + seguridad + orquestación
├── ai-engine/          # Python + FastAPI — BirdNET y clasificación por foto
├── database/           # Scripts SQL para ejecución manual en Supabase (RLS, triggers, migraciones puntuales)
├── images/             # Recursos gráficos del proyecto
└── repositorys/        # Repos de referencia de birdnet-team (git-ignorado, solo consulta/inspiración)
```

---

<p align="center">
Hecho con 🎧, ☕ por <strong>Daniers Alexander Solarte Lima</strong><br>
Ingeniería de Software — Universidad Cooperativa de Colombia
</p>

para corre la ia 
1. cd ai-engine
2. .venv\Scripts\activate
3. python -m uvicorn app.main:app --reload --port 8000
4. deactivate