from pydantic import BaseModel


class ClassificationCandidate(BaseModel):
    scientific_name: str
    common_name: str
    confidence: float  # 0-1, BirdNET's native scale


class ClassificationResponse(BaseModel):
    candidates: list[ClassificationCandidate]
