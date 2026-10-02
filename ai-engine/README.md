# AlaSonora AI Engine

Decoupled bioacoustic microservice: FastAPI + BirdNET (via `birdnetlib`),
called only by the Spring Boot backend over the internal network.

## Setup

```bash
cd ai-engine
python -m venv .venv
.venv/Scripts/activate       # Windows
pip install -r requirements.txt -r requirements-photo.txt
cp .env.example .env         # set INTERNAL_API_KEY
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`AI_ENGINE_API_KEY` in `backend/.env` must match `INTERNAL_API_KEY` here.

## Dependencies

- `requirements.txt`: everything the audio path (`/analyze`) needs.
- `requirements-photo.txt`: torch, torchvision, transformers and pillow,
  used **only** by `/classify-photo`. Install it only when photo
  identification is enabled (`PHOTO_CLASSIFICATION_ENABLED=true`, the
  default): `pip install -r requirements.txt -r requirements-photo.txt`.
  With the flag set to `false` these libraries are never imported, so a
  deployment can skip them; enabling the flag without them installed makes
  `/classify-photo` fail.

## Render (native Python Web Service, no Docker)

| Setting | Value |
|---|---|
| Root Directory | `ai-engine` |
| Build Command | `pip install -r requirements.txt` (audio only; add `-r requirements-photo.txt` if photos are re-enabled) |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |

Environment variables:

- `INTERNAL_API_KEY` (required, same value as the backend's `AI_ENGINE_API_KEY`).
- `PHOTO_CLASSIFICATION_ENABLED=false` on 512 MB instances: only the audio
  path fits (~360 MB in use); serving photos pushes the process to ~750 MB,
  so `/classify-photo` answers 503 instead of loading the model.
- Python comes from `.python-version` (3.12.3, the validated version); if
  Render ignores it, set `PYTHON_VERSION=3.12.3`.

## Audio pipeline

Every upload is cleaned (`AudioPreprocessor`: high-pass filter + peak
normalization) and quality-gated (`AudioQualityAnalyzer`: rejects excessive
background noise or the absence of bird-like frequencies) before reaching
BirdNET — see `app/audio_preprocessing.py` and `app/audio_quality.py`.
Thresholds are tunable via env vars (`AUDIO_HIGHPASS_CUTOFF_HZ`,
`AUDIO_NOISE_FLATNESS_THRESHOLD`, `AUDIO_BIRD_BAND_ENERGY_RATIO_THRESHOLD`).

Self-check (synthetic signals, no fixtures needed):

```bash
python -m app.test_audio_quality
```

See the repo root `README.md` for the full local setup guide covering all
three services (frontend, backend, ai-engine) together.
