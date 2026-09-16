"""Self-check del filtrado de clases no-aviares de BirdNET (ponytail: sin
pytest, solo asserts). No carga el modelo real: rank_candidates() es una
función pura sobre dicts con la misma forma que recording.detections.
Ejecutar con: python -m app.test_classifier"""

from app.classifier import rank_candidates


def _detection(scientific_name: str, common_name: str, confidence: float) -> dict:
    return {"scientific_name": scientific_name, "common_name": common_name, "confidence": confidence}


def demo() -> None:
    # Solo clases de no-evento superaron el umbral: debe quedar vacío, no
    # "Human vocal" disfrazado de especie.
    only_human_voice = [
        _detection("Human vocal", "Human vocal", 0.92),
        _detection("Noise", "Noise", 0.4),
    ]
    assert rank_candidates(only_human_voice, max_results=3) == []

    # Hay una especie real entre las clases de no-evento, aunque con menor
    # score: debe devolverse esa, ignorando "Human vocal" pese a su score más alto.
    mixed = [
        _detection("Human vocal", "Human vocal", 0.95),
        _detection("Luscinia megarhynchos", "Common Nightingale", 0.6),
        _detection("Dog", "Dog", 0.3),
    ]
    ranked = rank_candidates(mixed, max_results=3)
    assert len(ranked) == 1
    assert ranked[0].scientific_name == "Luscinia megarhynchos"

    # Ninguna clase de no-evento involucrada: comportamiento normal, sin
    # cambios — dedup por especie quedándose con la mejor confianza por chunk.
    normal = [
        _detection("Bubo virginianus", "Great Horned Owl", 0.5),
        _detection("Bubo virginianus", "Great Horned Owl", 0.7),
        _detection("Streptopelia decaocto", "Eurasian Collared-Dove", 0.65),
    ]
    ranked = rank_candidates(normal, max_results=3)
    assert [c.scientific_name for c in ranked] == ["Bubo virginianus", "Streptopelia decaocto"]
    assert ranked[0].confidence == 0.7

    print("classifier self-check: OK")


if __name__ == "__main__":
    demo()
