import io

import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

from app.schemas import PhotoClassificationCandidate


class NoBirdInPhotoError(Exception):
    """Raised when even the top prediction falls below the confidence floor."""


class BirdPhotoClassifier:
    """Wraps a Hugging Face image-classification model (EfficientNetB2 fine-tuned
    on 525 bird species), fully independent from BirdNetClassifier — a different
    model, a different input modality (photo, not audio), loaded once here for
    the same reason: reloading per request would be wasteful.
    """

    def __init__(self, model_id: str) -> None:
        self._processor = AutoImageProcessor.from_pretrained(model_id)
        self._model = AutoModelForImageClassification.from_pretrained(model_id)
        self._model.eval()

    def classify(
        self, image_bytes: bytes, min_confidence: float, max_results: int
    ) -> list[PhotoClassificationCandidate]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        inputs = self._processor(images=image, return_tensors="pt")
        with torch.no_grad():
            logits = self._model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)[0]
        top = torch.topk(probabilities, max_results)

        candidates = [
            PhotoClassificationCandidate(label=_format_label(self._model.config.id2label[idx]), confidence=score)
            for score, idx in zip(top.values.tolist(), top.indices.tolist())
            if score >= min_confidence
        ]
        if not candidates:
            raise NoBirdInPhotoError()
        return candidates


def _format_label(raw_label: str) -> str:
    # El modelo devuelve etiquetas en mayúsculas ("AZURE JAY"); se muestran
    # en Title Case, más legible en la UI que gritarlas tal cual.
    return raw_label.title()
