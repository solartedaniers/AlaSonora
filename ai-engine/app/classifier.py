from datetime import datetime

from birdnetlib import Recording
from birdnetlib.analyzer import Analyzer

from app.schemas import ClassificationCandidate


class BirdNetClassifier:
    """Wraps birdnetlib's BirdNET-Analyzer model.

    The model is loaded once (in __init__) and reused for every request —
    reloading it per request would be wasteful, since it's the same
    interpreter/weights regardless of which recording is being analyzed.
    """

    def __init__(self) -> None:
        self._analyzer = Analyzer()

    def classify(
        self,
        audio_path: str,
        latitude: float | None,
        longitude: float | None,
        recorded_at: datetime | None,
        min_confidence: float,
        max_results: int,
    ) -> list[ClassificationCandidate]:
        recording = Recording(
            self._analyzer,
            audio_path,
            lat=latitude,
            lon=longitude,
            date=recorded_at,
            min_conf=min_confidence,
        )
        recording.analyze()

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
