import { Injectable, NgZone, signal } from '@angular/core';
import { AudioProcessingResponse, AudioWorkerOutboundMessage } from '../../workers/messages';

export interface SpectrogramFrame {
  magnitudes: Float32Array;
  peakFrequencyHz: number;
  rmsDb: number;
}

/**
 * Servicio responsable de capturar audio del micrófono y delegar el
 * procesamiento pesado (FFT) al Web Worker dedicado, manteniendo el hilo
 * principal libre para renderizar la interfaz con fluidez.
 *
 * EVENT LOOP — TASKS vs MICROTASKS:
 * -----------------------------------------------------------------------
 * - `AudioContext` entrega los buffers de audio a través de un
 *   `AudioWorkletNode`/`ScriptProcessorNode`, cuyo callback se dispara
 *   como una TASK del event loop (evento del dispositivo de audio).
 * - Dentro de ese callback NO llamamos código async pesado directamente:
 *   solo copiamos el buffer y lo enviamos al worker vía `postMessage`
 *   (llamada síncrona, no bloqueante). La promesa que resuelve la
 *   respuesta del worker (`waitForFrame`) se resuelve como MICROTASK
 *   cuando llega el mensaje — las microtasks se procesan antes de que el
 *   navegador pinte el siguiente frame o ejecute la siguiente task, así
 *   que encolar aquí (en vez de en una task nueva) evita introducir un
 *   frame de retraso extra en la actualización del signal `latestFrame`.
 * - La actualización VISUAL del espectrograma (dibujar en <canvas>) se
 *   agenda explícitamente como TASK mediante `requestAnimationFrame` en
 *   `SpectrogramCanvasComponent`, nunca aquí: así el trabajo de captura/
 *   procesamiento (microtasks) nunca compite por el mismo turno del loop
 *   que el trabajo de pintado (tasks), y la interfaz nunca se congela
 *   aunque lleguen frames de audio muy seguidos.
 */
@Injectable({ providedIn: 'root' })
export class AudioCaptureService {
  readonly isRecording = signal(false);
  readonly latestFrame = signal<SpectrogramFrame | null>(null);
  readonly elapsedSeconds = signal(0);

  private worker?: Worker;
  private audioContext?: AudioContext;
  private mediaStream?: MediaStream;
  private processorNode?: ScriptProcessorNode;
  private chunkCounter = 0;
  private startedAt = 0;
  private elapsedIntervalId?: ReturnType<typeof setInterval>;

  constructor(private readonly zone: NgZone) {}

  async start(): Promise<void> {
    if (this.isRecording()) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // NgZone.runOutsideAngular: el procesamiento de audio no debe disparar
    // detección de cambios en cada buffer (varias veces por segundo); solo
    // actualizamos el signal, que Angular observa de forma granular.
    this.zone.runOutsideAngular(() => {
      this.worker = new Worker(new URL('../../workers/audio-processing.worker', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = ({ data }: MessageEvent<AudioWorkerOutboundMessage>) =>
        this.onWorkerMessage(data);

      this.processorNode = this.audioContext!.createScriptProcessor(2048, 1, 1);
      this.processorNode.onaudioprocess = (event) => this.onAudioProcess(event);
      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext!.destination);
    });

    this.isRecording.set(true);
    this.startedAt = performance.now();
    this.elapsedIntervalId = setInterval(() => {
      this.elapsedSeconds.set((performance.now() - this.startedAt) / 1000);
    }, 100);
  }

  stop(): void {
    this.processorNode?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.worker?.terminate();
    if (this.elapsedIntervalId) clearInterval(this.elapsedIntervalId);

    this.isRecording.set(false);
    this.processorNode = undefined;
    this.audioContext = undefined;
    this.mediaStream = undefined;
    this.worker = undefined;
  }

  private onAudioProcess(event: AudioProcessingEvent): void {
    if (!this.worker) return;
    const samples = event.inputBuffer.getChannelData(0).slice();
    this.chunkCounter += 1;

    this.worker.postMessage(
      {
        type: 'process-audio-chunk',
        chunkId: this.chunkCounter,
        samples,
        sampleRate: this.audioContext?.sampleRate ?? 44100,
        fftSize: 1024,
      },
      [samples.buffer]
    );
  }

  private onWorkerMessage(data: AudioWorkerOutboundMessage): void {
    if (data.type !== 'spectrogram-frame') return;
    const frame: SpectrogramFrame = {
      magnitudes: (data as AudioProcessingResponse).magnitudes,
      peakFrequencyHz: data.peakFrequencyHz,
      rmsDb: data.rmsDb,
    };
    // Reentramos a la zona de Angular solo para la actualización del signal
    // que la UI observa; el resto del pipeline permanece fuera de la zona.
    this.zone.run(() => this.latestFrame.set(frame));
  }
}
