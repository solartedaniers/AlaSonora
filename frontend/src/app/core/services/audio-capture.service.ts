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
  // Cutoff bajo el rango típico de canto de aves (2-8 kHz); filtra rumble de
  // viento/tráfico sin recortar la señal de interés.
  private static readonly HIGH_PASS_CUTOFF_HZ = 300;

  readonly isRecording = signal(false);
  readonly latestFrame = signal<SpectrogramFrame | null>(null);
  readonly elapsedSeconds = signal(0);
  // 0 dB por defecto: el slider hasta ahora era decorativo (nunca tocaba el
  // audio real), así que su valor de UI de +12dB nunca se validó contra la
  // señal real. Con el GainNode ya conectado de verdad, +12dB (~x4 lineal)
  // saturaba casi toda grabación con nivel de micrófono normal — confirmado
  // simulando la misma conversión dB→lineal y el clamp de encodeWav sobre
  // una señal de amplitud realista (pico 0.5 tras el AGC del navegador):
  // ~67% de las muestras quedaban recortadas. 0dB deja el nivel del
  // micrófono intacto; el usuario sube ganancia solo cuando la necesita.
  readonly gainDb = signal(0);
  readonly highPassEnabled = signal(true);

  private worker?: Worker;
  private audioContext?: AudioContext;
  private mediaStream?: MediaStream;
  private gainNode?: GainNode;
  private filterNode?: BiquadFilterNode;
  private limiterNode?: DynamicsCompressorNode;
  private processorNode?: ScriptProcessorNode;
  private chunkCounter = 0;
  private startedAt = 0;
  private elapsedIntervalId?: ReturnType<typeof setInterval>;

  constructor(private readonly zone: NgZone) {}

  /** Aplicado de inmediato al GainNode en vivo si hay una grabación en curso. */
  setGainDb(db: number): void {
    this.gainDb.set(db);
    if (this.gainNode) this.gainNode.gain.value = AudioCaptureService.dbToLinear(db);
  }

  /** Aplicado de inmediato al BiquadFilterNode en vivo si hay una grabación en curso. */
  setHighPassEnabled(enabled: boolean): void {
    this.highPassEnabled.set(enabled);
    if (this.filterNode) {
      this.filterNode.frequency.value = enabled ? AudioCaptureService.HIGH_PASS_CUTOFF_HZ : 0;
    }
  }

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

      this.gainNode = this.audioContext!.createGain();
      this.gainNode.gain.value = AudioCaptureService.dbToLinear(this.gainDb());

      this.filterNode = this.audioContext!.createBiquadFilter();
      this.filterNode.type = 'highpass';
      this.filterNode.frequency.value = this.highPassEnabled() ? AudioCaptureService.HIGH_PASS_CUTOFF_HZ : 0;

      // Limitador: encodeWav (worker) recorta duro a [-1,1], lo que introduce
      // distorsión armónica severa si el gain empuja la señal por encima de
      // ese rango. Este compresor con ratio casi-infinito y ataque rápido
      // evita que el GainNode sature la señal sin importar cuánta ganancia
      // pida el usuario, en vez de solo confiar en un valor por defecto bajo.
      this.limiterNode = this.audioContext!.createDynamicsCompressor();
      this.limiterNode.threshold.value = -3;
      this.limiterNode.knee.value = 0;
      this.limiterNode.ratio.value = 20;
      this.limiterNode.attack.value = 0.003;
      this.limiterNode.release.value = 0.25;

      this.processorNode = this.audioContext!.createScriptProcessor(2048, 1, 1);
      this.processorNode.onaudioprocess = (event) => this.onAudioProcess(event);

      // source -> gain -> highpass -> limiter -> processor: el worker mide
      // RMS sobre la señal YA afectada por estos nodos, así el slider/toggle
      // cambian el nivel real capturado, no solo un valor decorativo en la UI.
      source.connect(this.gainNode);
      this.gainNode.connect(this.filterNode);
      this.filterNode.connect(this.limiterNode);
      this.limiterNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext!.destination);
    });

    this.isRecording.set(true);
    this.startedAt = performance.now();
    this.elapsedIntervalId = setInterval(() => {
      this.elapsedSeconds.set((performance.now() - this.startedAt) / 1000);
    }, 100);
  }

  private static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  /**
   * Detiene la captura y pide al worker que empaquete todo el audio
   * acumulado como un WAV antes de terminarlo, para poder subirlo a
   * Supabase Storage sin haber bloqueado el hilo principal con esa
   * codificación.
   */
  async stop(): Promise<Blob> {
    this.gainNode?.disconnect();
    this.filterNode?.disconnect();
    this.limiterNode?.disconnect();
    this.processorNode?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.elapsedIntervalId) clearInterval(this.elapsedIntervalId);

    const worker = this.worker;
    const wavBlob = await new Promise<Blob>((resolve, reject) => {
      if (!worker) {
        reject(new Error('No active recording worker.'));
        return;
      }
      worker.onmessage = ({ data }: MessageEvent<AudioWorkerOutboundMessage>) => {
        if (data.type !== 'recording-encoded') return;
        resolve(new Blob([data.wavBuffer], { type: 'audio/wav' }));
      };
      worker.postMessage({ type: 'finalize-recording' });
    });
    worker?.terminate();

    this.isRecording.set(false);
    this.gainNode = undefined;
    this.filterNode = undefined;
    this.limiterNode = undefined;
    this.processorNode = undefined;
    this.audioContext = undefined;
    this.mediaStream = undefined;
    this.worker = undefined;
    return wavBlob;
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
