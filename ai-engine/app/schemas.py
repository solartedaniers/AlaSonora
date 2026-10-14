from pydantic import BaseModel


class ClassificationCandidate(BaseModel):
    scientific_name: str
    common_name: str
    confidence: float  # 0-1, la escala propia de BirdNET


class ClassificationResponse(BaseModel):
    candidates: list[ClassificationCandidate]


class PhotoClassificationCandidate(BaseModel):
    label: str
    confidence: float  # 0-1, puntaje softmax


class PhotoClassificationResponse(BaseModel):
    candidates: list[PhotoClassificationCandidate]
