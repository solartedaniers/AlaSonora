import numpy as np
from scipy.signal import butter, sosfiltfilt


class AudioPreprocessor:
    """Limpia la señal antes de pasarla a BirdNET.

    Aplica un filtro pasa-altos (corta el retumbo de baja frecuencia típico
    del viento y del manejo del micrófono en campo) y normaliza la amplitud
    para que grabaciones flojas no queden por debajo del umbral de detección
    del modelo. No intenta eliminar el ruido por completo: eso lo evalúa
    después AudioQualityAnalyzer.
    """

    def __init__(self, highpass_cutoff_hz: float = 300.0, filter_order: int = 4) -> None:
        self._highpass_cutoff_hz = highpass_cutoff_hz
        self._filter_order = filter_order

    def clean(self, samples: np.ndarray, sample_rate: int) -> np.ndarray:
        filtered = self._apply_highpass(samples, sample_rate)
        return self._normalize(filtered)

    def _apply_highpass(self, samples: np.ndarray, sample_rate: int) -> np.ndarray:
        nyquist = sample_rate / 2
        # sosfiltfilt (vs. lfilter) aplica el filtro dos veces (adelante y
        # atrás) para no introducir desfase de fase en la señal.
        sos = butter(self._filter_order, self._highpass_cutoff_hz / nyquist, btype="highpass", output="sos")
        return sosfiltfilt(sos, samples)

    def _normalize(self, samples: np.ndarray) -> np.ndarray:
        peak = np.max(np.abs(samples))
        if peak == 0:
            return samples
        return samples / peak
