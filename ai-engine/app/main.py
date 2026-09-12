import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile, status
from fastapi.security import APIKeyHeader

from app.classifier import BirdNetClassifier
from app.config import settings
from app.schemas import ClassificationResponse

api_key_header = APIKeyHeader(name="X-Internal-Api-Key")


def require_api_key(api_key: str = Depends(api_key_header)) -> None:
    if api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cargado una sola vez al iniciar: el modelo BirdNET pesa varios cientos
    # de MB y su carga es lenta, repetirla por request sería inaceptable.
    app.state.classifier = BirdNetClassifier()
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
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    recorded_at: datetime | None = Form(default=None),
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
            latitude,
            longitude,
            recorded_at,
            min_confidence,
            max_results,
        )
    finally:
        os.remove(tmp_path)

    return ClassificationResponse(candidates=candidates)
