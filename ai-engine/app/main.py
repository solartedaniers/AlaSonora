import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile, status
from fastapi.security import APIKeyHeader

from app.audio_quality import NoBirdSignalDetectedError, TooNoisyAudioError
from app.classifier import BirdNetClassifier
from app.config import settings
from app.photo_classifier import BirdPhotoClassifier, NoBirdInPhotoError
from app.schemas import ClassificationResponse, PhotoClassificationResponse

# Mensajes exactos que debe ver el usuario final en el frontend (vía el
# backend de Spring Boot, que reenvía este "detail" sin modificarlo).
TOO_NOISY_MESSAGE = "Demasiada interferencia de ruido, por favor grabe de nuevo o cargue un audio más limpio"
NO_BIRD_SIGNAL_MESSAGE = "No se detecta sonido de aves en la grabación, por favor intente nuevamente"
NO_BIRD_IN_PHOTO_MESSAGE = "No se pudo identificar un ave en esta foto, por favor intente con otra imagen"

api_key_header = APIKeyHeader(name="X-Internal-Api-Key")


def require_api_key(api_key: str = Depends(api_key_header)) -> None:
    if api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cargado una sola vez al iniciar: el modelo BirdNET pesa varios cientos
    # de MB y su carga es lenta, repetirla por request sería inaceptable.
    app.state.classifier = BirdNetClassifier()
    # Modelo de foto, completamente independiente del de audio; mismo motivo
    # para cargarlo una sola vez en el arranque.
    app.state.photo_classifier = BirdPhotoClassifier(settings.photo_model_id)
    app.state.inference_pool = ThreadPoolExecutor(max_workers=settings.max_inference_workers)
    yield
    app.state.inference_pool.shutdown(wait=False)


app = FastAPI(title="AlaSonora AI Engine", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=ClassificationResponse, dependencies=[Depends(require_api_key)])
async def analyze(
    audio: UploadFile,
    min_confidence: float = Form(default=settings.default_min_confidence),
    max_results: int = Form(default=settings.default_max_results),
    recorded_at: datetime | None = Form(default=None),
    # Opcionales: solo deben venir cuando el backend tiene una ubicación GPS
    # real del dispositivo (ver BirdNetClassifier.classify).
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
) -> ClassificationResponse:
    suffix = os.path.splitext(audio.filename or "recording.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
        tmp_file.write(await audio.read())
        tmp_path = tmp_file.name

    try:
        loop = asyncio.get_running_loop()
        # El análisis de BirdNET es bloqueante/CPU-bound (TFLite); se despacha
        # a un ThreadPoolExecutor acotado para no congelar el event loop de
        # FastAPI mientras corre.
        candidates = await loop.run_in_executor(
            app.state.inference_pool,
            app.state.classifier.classify,
            tmp_path,
            recorded_at,
            min_confidence,
            max_results,
            latitude,
            longitude,
        )
    except TooNoisyAudioError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=TOO_NOISY_MESSAGE) from exc
    except NoBirdSignalDetectedError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=NO_BIRD_SIGNAL_MESSAGE) from exc
    finally:
        os.remove(tmp_path)

    return ClassificationResponse(candidates=candidates)


@app.post("/classify-photo", response_model=PhotoClassificationResponse, dependencies=[Depends(require_api_key)])
async def classify_photo(
    photo: UploadFile,
    min_confidence: float = Form(default=settings.default_photo_min_confidence),
    max_results: int = Form(default=settings.default_photo_max_results),
) -> PhotoClassificationResponse:
    image_bytes = await photo.read()
    loop = asyncio.get_running_loop()
    try:
        candidates = await loop.run_in_executor(
            app.state.inference_pool,
            app.state.photo_classifier.classify,
            image_bytes,
            min_confidence,
            max_results,
        )
    except NoBirdInPhotoError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=NO_BIRD_IN_PHOTO_MESSAGE) from exc

    return PhotoClassificationResponse(candidates=candidates)
