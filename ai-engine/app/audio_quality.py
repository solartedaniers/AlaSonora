import librosa
import numpy as np


class TooNoisyAudioError(Exception):
    """La grabación tiene demasiado ruido estático/de fondo para analizarla."""


class NoBirdSignalDetectedError(Exception):
    """Hay sonido en la grabación, pero no en el rango espectral típico del canto de aves."""


class AudioQualityAnalyzer:
    """Evalúa la señal antes de invertir cómputo en BirdNET.

    Dos heurísticas espectrales, en orden:
      1. Aplanamiento espectral (spectral flatness): el ruido blanco/estático
         (viento, lluvia, interferencia) tiene un espectro plano (flatness
         cercano a 1); un canto de ave es tonal, con picos de energía
         concentrados (flatness bajo). Flatness alto ⇒ demasiado ruido.
      2. Proporción de energía en la banda 1-8 kHz, donde vocaliza la mayoría
         de las aves paseriformes: si casi toda la energía está fuera de esa
         banda (tráfico, motores, voces graves) no hay patrón de ave, aunque
         la grabación en sí no sea "ruidosa" en el sentido de la heurística 1.
    """

    BIRD_BAND_HZ = (1000.0, 8000.0)

    def __init__(
        self,
        flatness_threshold: float = 0.3,
        bird_band_energy_ratio_threshold: float = 0.15,
        n_fft: int = 2048,
    ) -> None:
        self._flatness_threshold = flatness_threshold
        self._bird_band_energy_ratio_threshold = bird_band_energy_ratio_threshold
        self._n_fft = n_fft

    def assert_quality(self, samples: np.ndarray, sample_rate: int) -> None:
        # Silencio (o casi): no hay señal que analizar, ni ruido ni ave.
        # Se descarta aparte porque un espectro todo-ceros vuelve indefinido
        # (y en la práctica "ruidoso" por convención) el cálculo de flatness.
        if self._is_silence(samples):
            raise NoBirdSignalDetectedError()

        magnitude_spectrum = np.abs(librosa.stft(samples, n_fft=self._n_fft))
        power_spectrum = magnitude_spectrum**2

        if self._spectral_flatness(magnitude_spectrum) > self._flatness_threshold:
            raise TooNoisyAudioError()

        if self._bird_band_energy_ratio(power_spectrum, sample_rate) < self._bird_band_energy_ratio_threshold:
            raise NoBirdSignalDetectedError()

    def _is_silence(self, samples: np.ndarray, rms_threshold: float = 1e-4) -> bool:
        return float(np.sqrt(np.mean(samples**2))) < rms_threshold

    def _spectral_flatness(self, magnitude_spectrum: np.ndarray) -> float:
        flatness = librosa.feature.spectral_flatness(S=magnitude_spectrum)
        return float(np.mean(flatness))

    def _bird_band_energy_ratio(self, power_spectrum: np.ndarray, sample_rate: int) -> float:
        frequencies = librosa.fft_frequencies(sr=sample_rate, n_fft=self._n_fft)
        low, high = self.BIRD_BAND_HZ
        band_mask = (frequencies >= low) & (frequencies <= high)

        total_energy = float(np.sum(power_spectrum))
        if total_energy == 0:
            return 0.0

        band_energy = float(np.sum(power_spectrum[band_mask, :]))
        return band_energy / total_energy
