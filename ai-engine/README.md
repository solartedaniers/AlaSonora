# AlaSonora AI Engine

Decoupled bioacoustic microservice: FastAPI + BirdNET (via `birdnetlib`),
called only by the Spring Boot backend over the internal network.

## Setup

```bash
cd ai-engine
python -m venv .venv
.venv/Scripts/activate       # Windows
pip install -r requirements.txt
cp .env.example .env         # set INTERNAL_API_KEY
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`AI_ENGINE_API_KEY` in `backend/.env` must match `INTERNAL_API_KEY` here.

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
