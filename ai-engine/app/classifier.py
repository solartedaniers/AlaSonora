import os
import tempfile
from datetime import datetime

import librosa
import soundfile as sf
from birdnetlib import Recording
from birdnetlib.analyzer import Analyzer

from app.audio_preprocessing import AudioPreprocessor
from app.audio_quality import AudioQualityAnalyzer
from app.config import settings
from app.schemas import ClassificationCandidate

# BirdNET_GLOBAL_6K_V2.4 (el modelo que carga Analyzer() por defecto) incluye
# estas clases de "no-evento" junto a las especies reales, para sonidos de
# fondo comunes en grabaciones de campo. Verificado línea por línea contra el
# archivo de labels real instalado (birdnetlib/models/analyzer/
# BirdNET_GLOBAL_6K_V2.4_Labels.txt) el 2026-09-16 — si se actualiza el
# modelo a otra versión, hay que revisar este archivo de nuevo, birdnetlib no
# expone un mecanismo propio para distinguirlas (analyzer_lite.py tiene su
# propia lista ad-hoc, con nombres distintos, para un modelo distinto).
# No tienen binomio científico real: es.split("_")[0] da igual el string que
# common_name, así que no se pueden confundir con una especie genuina.
NON_EVENT_LABELS = frozenset({
    "Dog",
    "Engine",
    "Environmental",
    "Fireworks",
    "Gun",
    "Human non-vocal",
    "Human vocal",
    "Human whistle",
    "Noise",
    "Power tools",
    "Siren",
})


class BirdNetClassifier:
    """Wraps birdnetlib's BirdNET-Analyzer model.

    The model is loaded once (in __init__) and reused for every request —
    reloading it per request would be wasteful, since it's the same
    interpreter/weights regardless of which recording is being analyzed.
    """

    def __init__(self) -> None:
        self._analyzer = Analyzer()
        self._preprocessor = AudioPreprocessor(highpass_cutoff_hz=settings.audio_highpass_cutoff_hz)
        self._quality_analyzer = AudioQualityAnalyzer(
            flatness_threshold=settings.audio_noise_flatness_threshold,
            bird_band_energy_ratio_threshold=settings.audio_bird_band_energy_ratio_threshold,
        )

    def classify(
        self,
        audio_path: str,
        recorded_at: datetime | None,
        min_confidence: float,
        max_results: int,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[ClassificationCandidate]:
        # sr=None conserva la tasa de muestreo original; mono=True promedia
        # canales si la grabación viene en estéreo.
        samples, sample_rate = librosa.load(audio_path, sr=None, mono=True)
        cleaned_samples = self._preprocessor.clean(samples, sample_rate)

        # Puede lanzar TooNoisyAudioError o NoBirdSignalDetectedError: se
        # propagan tal cual hasta el endpoint, que las traduce a un mensaje
        # específico para el usuario en vez de dejar que BirdNET intente
        # analizar una señal que ya sabemos que no sirve.
        self._quality_analyzer.assert_quality(cleaned_samples, sample_rate)

        cleaned_path = self._write_temp_wav(cleaned_samples, sample_rate)
        try:
            # lat/lon es opcional a propósito: solo se debe pasar cuando
            # viene de una ubicación real (GPS del dispositivo), nunca de un
            # valor inventado/por defecto — pasarla activa birdnetlib's
            # set_predicted_species_list_from_position, que excluye de
            # entrada cualquier especie fuera de la lista "esperable" para
            # esas coordenadas. Sin ubicación real, se evalúa contra el
            # catálogo global completo (comportamiento anterior).
            recording = Recording(
                self._analyzer,
                cleaned_path,
                date=recorded_at,
                min_conf=min_confidence,
                lat=latitude,
                lon=longitude,
            )
            recording.analyze()
        finally:
            os.remove(cleaned_path)

        return rank_candidates(recording.detections, max_results)

    def _write_temp_wav(self, samples, sample_rate: int) -> str:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            cleaned_path = tmp_file.name
        sf.write(cleaned_path, samples, sample_rate)
        return cleaned_path


def rank_candidates(detections: list[dict], max_results: int) -> list[ClassificationCandidate]:
    """Turns birdnetlib's raw per-chunk detections into ranked, deduplicated
    species candidates. Pure function (no model, no I/O) so the non-event
    filtering can be unit-tested without loading BirdNET — see
    test_classifier.py.

    BirdNET scores audio in 3-second chunks, so the same species can show up
    several times across one recording — keep only its best confidence, then
    rank species (not chunks) highest-first.
    """
    best_by_species: dict[str, ClassificationCandidate] = {}
    for detection in detections:
        scientific_name = detection["scientific_name"]
        if scientific_name in NON_EVENT_LABELS:
            # No es un ave: voz humana, ruido, sirena, etc. Se descarta aquí
            # mismo, nunca llega a convertirse en un candidato — si es lo
            # único que superó el umbral, el resultado queda vacío y el
            # endpoint lo trata igual que "ninguna especie identificada"
            # (ver DetectionClassificationService).
            continue
        confidence = float(detection["confidence"])
        existing = best_by_species.get(scientific_name)
        if existing is None or confidence > existing.confidence:
            best_by_species[scientific_name] = ClassificationCandidate(
                scientific_name=scientific_name,
                common_name=detection["common_name"],
                confidence=confidence,
            )

    ranked = sorted(best_by_species.values(), key=lambda c: c.confidence, reverse=True)
    return ranked[:max_results]
