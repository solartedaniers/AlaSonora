/// <reference lib="webworker" />

import { AudioWorkerInboundMessage, AudioWorkerOutboundMessage } from './messages';

/**
 * Web Worker dedicado (no comparte hilo con la UI, sin acceso al DOM).
 * Recibe fragmentos de audio PCM capturados en `AudioCaptureService` y
 * calcula su espectro (FFT ingenua, suficiente para visualización en
 * tiempo real) para no bloquear jamás el hilo principal del navegador
 * mientras se graba o sube un audio largo.
 */
addEventListener('message', ({ data }: MessageEvent<AudioWorkerInboundMessage>) => {
  if (data.type !== 'process-audio-chunk') return;

  const { chunkId, samples, sampleRate, fftSize } = data;
  const magnitudes = computeMagnitudeSpectrum(samples, fftSize);
  const peakFrequencyHz = findPeakFrequency(magnitudes, sampleRate, fftSize);
  const rmsDb = computeRmsDb(samples);

  const response: AudioWorkerOutboundMessage = {
    type: 'spectrogram-frame',
    chunkId,
    magnitudes,
    peakFrequencyHz,
    rmsDb,
  };

  // Transferimos el buffer subyacente en vez de copiarlo: más barato para
  // fragmentos grandes y evita retener memoria duplicada en el worker.
  (postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [
    magnitudes.buffer,
  ]);
});

/** DFT directa O(n²): suficientemente rápida para ventanas cortas (<=2048) en un worker dedicado. */
function computeMagnitudeSpectrum(samples: Float32Array, fftSize: number): Float32Array {
  const n = Math.min(samples.length, fftSize);
  const half = Math.floor(n / 2);
  const magnitudes = new Float32Array(half);

  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      const windowed = samples[t] * hannWindow(t, n);
      re += windowed * Math.cos(angle);
      im -= windowed * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(re * re + im * im) / n;
  }

  return magnitudes;
}

function hannWindow(t: number, n: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * t) / (n - 1)));
}

function findPeakFrequency(magnitudes: Float32Array, sampleRate: number, fftSize: number): number {
  let peakBin = 0;
  let peakValue = -Infinity;
  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] > peakValue) {
      peakValue = magnitudes[i];
      peakBin = i;
    }
  }
  return (peakBin * sampleRate) / fftSize;
}

function computeRmsDb(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
  const rms = Math.sqrt(sumSquares / samples.length);
  return 20 * Math.log10(Math.max(rms, 1e-8));
}
