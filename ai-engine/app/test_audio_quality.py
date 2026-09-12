"""Self-check de las heurísticas de calidad de audio (ponytail: sin pytest,
solo asserts). Ejecutar con: python -m app.test_audio_quality"""

import numpy as np

from app.audio_preprocessing import AudioPreprocessor
from app.audio_quality import AudioQualityAnalyzer, NoBirdSignalDetectedError, TooNoisyAudioError

SAMPLE_RATE = 22050
DURATION_S = 3
TIME = np.linspace(0, DURATION_S, SAMPLE_RATE * DURATION_S, endpoint=False)


def _assert_quality(samples: np.ndarray, expected_error: type[Exception] | None) -> None:
    preprocessor = AudioPreprocessor()
    analyzer = AudioQualityAnalyzer()
    cleaned = preprocessor.clean(samples, SAMPLE_RATE)

    if expected_error is None:
        analyzer.assert_quality(cleaned, SAMPLE_RATE)  # no debe lanzar
        return

    try:
        analyzer.assert_quality(cleaned, SAMPLE_RATE)
    except expected_error:
        return
    raise AssertionError(f"expected {expected_error.__name__} to be raised")


def demo() -> None:
    rng = np.random.default_rng(42)

    _assert_quality(0.8 * np.sin(2 * np.pi * 3500 * TIME), None)
    _assert_quality(rng.normal(0, 1, SAMPLE_RATE * DURATION_S), TooNoisyAudioError)
    _assert_quality(0.8 * np.sin(2 * np.pi * 120 * TIME), NoBirdSignalDetectedError)
    _assert_quality(np.zeros(SAMPLE_RATE * DURATION_S), NoBirdSignalDetectedError)
    _assert_quality(
        0.8 * np.sin(2 * np.pi * 3500 * TIME) + 0.25 * rng.normal(0, 1, SAMPLE_RATE * DURATION_S), None
    )

    print("audio_quality self-check: OK")


if __name__ == "__main__":
    demo()
