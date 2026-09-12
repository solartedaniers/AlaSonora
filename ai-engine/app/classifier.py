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
        latitude: float | None,
        longitude: float | None,
        recorded_at: datetime | None,
        min_confidence: float,
        max_results: int,
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
            recording = Recording(
                self._analyzer,
                cleaned_path,
                lat=latitude,
                lon=longitude,
                date=recorded_at,
                min_conf=min_confidence,
            )
            recording.analyze()
        finally:
            os.remove(cleaned_path)

        # BirdNET scores audio in 3-second chunks, so the same species can
        # show up several times across one recording — keep only its best
        # confidence, then rank species (not chunks) highest-first.
        best_by_species: dict[str, ClassificationCandidate] = {}
        for detection in recording.detections:
            scientific_name = detection["scientific_name"]
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

    def _write_temp_wav(self, samples, sample_rate: int) -> str:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            cleaned_path = tmp_file.name
        sf.write(cleaned_path, samples, sample_rate)
        return cleaned_path
