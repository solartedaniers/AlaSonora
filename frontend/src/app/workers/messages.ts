/**
 * Contratos de mensajes tipados para la comunicación con los 3 Web Workers
 * de AlaSonora. Definir interfaces explícitas (en vez de pasar objetos
 * sueltos sin tipar por postMessage) evita errores silenciosos: TypeScript
 * verifica en tiempo de compilación que el hilo principal y cada worker
 * están de acuerdo sobre la forma de cada mensaje.
 */

// ---------------------------------------------------------------------------
// 1. Web Worker: audio-processing.worker.ts (cálculo de FFT / espectrograma)
// ---------------------------------------------------------------------------

export interface AudioProcessingRequest {
  type: 'process-audio-chunk';
  chunkId: number;
  /** Buffer de audio PCM mono, transferido (no copiado) al worker. */
  samples: Float32Array;
  sampleRate: number;
  fftSize: 256 | 512 | 1024 | 2048;
}

export interface AudioProcessingResponse {
  type: 'spectrogram-frame';
  chunkId: number;
  /** Magnitudes por bin de frecuencia, listas para pintar en el canvas. */
  magnitudes: Float32Array;
  peakFrequencyHz: number;
  rmsDb: number;
}

export type AudioWorkerInboundMessage = AudioProcessingRequest;
export type AudioWorkerOutboundMessage = AudioProcessingResponse;

// ---------------------------------------------------------------------------
// 2. Shared Worker: sync.worker.ts (estado compartido entre pestañas)
// ---------------------------------------------------------------------------

export interface SharedWorkerHello {
  type: 'hello';
  tabId: string;
}

export interface SharedWorkerDetectionBroadcast {
  type: 'detection-broadcast';
  detectionId: string;
  speciesCommonName: string;
  latitude: number;
  longitude: number;
  confidence: number;
  originTabId: string;
}

export interface SharedWorkerTabCount {
  type: 'tab-count';
  count: number;
}

export type SharedWorkerInboundMessage = SharedWorkerHello | SharedWorkerDetectionBroadcast;
export type SharedWorkerOutboundMessage = SharedWorkerDetectionBroadcast | SharedWorkerTabCount;

// ---------------------------------------------------------------------------
// 3. Service Worker: mensajes de sincronización en segundo plano
// ---------------------------------------------------------------------------

export interface ServiceWorkerSyncRequest {
  type: 'request-sync';
}

export interface ServiceWorkerSyncComplete {
  type: 'sync-complete';
  syncedCount: number;
}

export type ServiceWorkerMessage = ServiceWorkerSyncRequest | ServiceWorkerSyncComplete;
