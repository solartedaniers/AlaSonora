/// <reference lib="webworker" />

import { AudioWorkerInboundMessage, AudioWorkerOutboundMessage } from './messages';

/**
 * Web Worker dedicado (no comparte hilo con la UI, sin acceso al DOM).
 * Recibe fragmentos de audio PCM capturados en `AudioCaptureService` y
 * calcula su espectro (FFT ingenua, suficiente para visualización en
 * tiempo real) para no bloquear jamás el hilo principal del navegador
 * mientras se graba o sube un audio largo.
 */
// Muestras PCM acumuladas de la grabación en curso, en el orden en que
// llegaron los chunks, para poder empaquetarlas como WAV al finalizar sin
// que el hilo principal tenga que tocar el audio crudo.
let recordedChunks: Float32Array[] = [];
let recordedSampleRate = 0;

addEventListener('message', ({ data }: MessageEvent<AudioWorkerInboundMessage>) => {
  if (data.type === 'finalize-recording') {
    const wavBuffer = encodeWav(recordedChunks, recordedSampleRate);
    recordedChunks = [];

    const response: AudioWorkerOutboundMessage = { type: 'recording-encoded', wavBuffer };
    (postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [wavBuffer]);
    return;
  }

  if (data.type !== 'process-audio-chunk') return;

  const { chunkId, samples, sampleRate, fftSize } = data;
  recordedSampleRate = sampleRate;
  recordedChunks.push(samples.slice());

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

/** Empaqueta PCM float32 [-1,1] concatenado como WAV mono PCM 16-bit (formato universalmente soportado). */
function encodeWav(chunks: Float32Array[], sampleRate: number): ArrayBuffer {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const dataSize = totalSamples * 2; // 16-bit = 2 bytes/muestra
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // tamaño del subchunk fmt
  view.setUint16(20, 1, true); // PCM lineal
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits por muestra
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const clamped = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

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
