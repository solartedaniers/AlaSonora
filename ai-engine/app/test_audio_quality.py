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


def _owl_hoot_train(fundamental_hz: float, n_harmonics: int = 3, pulse_s: float = 0.35, gap_s: float = 0.4) -> np.ndarray:
    """Proxy sintético de un búho: pulsos de tono grave + armónicos, no un
    canto continuo de una sola frecuencia como el resto de casos de este
    archivo (así se parece más a un hoot real que a una nota pura)."""
    signal = np.zeros_like(TIME)
    t_cursor = 0.2
    while t_cursor + pulse_s < DURATION_S:
        mask = (TIME >= t_cursor) & (TIME < t_cursor + pulse_s)
        local_t = TIME[mask] - t_cursor
        envelope = np.sin(np.pi * local_t / pulse_s) ** 2
        tone = sum((1.0 / h) * np.sin(2 * np.pi * fundamental_hz * h * local_t) for h in range(1, n_harmonics + 1))
        signal[mask] += envelope * tone
        t_cursor += pulse_s + gap_s
    return signal / np.max(np.abs(signal))


def _with_noise(signal: np.ndarray, noise: np.ndarray, ratio: float) -> np.ndarray:
    signal_rms = np.sqrt(np.mean(signal**2))
    noise_rms = np.sqrt(np.mean(noise**2))
    mixed = signal + noise * (signal_rms * ratio / (noise_rms + 1e-12))
    return mixed / np.max(np.abs(mixed))


def demo() -> None:
    rng = np.random.default_rng(42)
    owl_call = _owl_hoot_train(350.0)

    _assert_quality(0.8 * np.sin(2 * np.pi * 3500 * TIME), None)
    _assert_quality(rng.normal(0, 1, SAMPLE_RATE * DURATION_S), TooNoisyAudioError)
    _assert_quality(0.8 * np.sin(2 * np.pi * 120 * TIME), NoBirdSignalDetectedError)
    _assert_quality(np.zeros(SAMPLE_RATE * DURATION_S), NoBirdSignalDetectedError)
    _assert_quality(
        0.8 * np.sin(2 * np.pi * 3500 * TIME) + 0.25 * rng.normal(0, 1, SAMPLE_RATE * DURATION_S), None
    )

    # Low-frequency vocalization (owl-like), same predominant/leve/moderate
    # noise gradient as the passerine case above — must not be rejected just
    # because its energy sits below the passerine-typical 1-8 kHz band.
    _assert_quality(_with_noise(owl_call, rng.normal(0, 1, owl_call.shape), 0.15), None)
    _assert_quality(_with_noise(owl_call, rng.normal(0, 1, owl_call.shape), 0.35), None)
    _assert_quality(_with_noise(owl_call, rng.normal(0, 1, owl_call.shape), 0.8), TooNoisyAudioError)

    print("audio_quality self-check: OK")


if __name__ == "__main__":
    demo()
