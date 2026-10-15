import { computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ClassificationStage = 'uploading' | 'verifying' | 'waking' | 'analyzing' | 'done';

const { uploadEnd, verifyEnd, estimateCap, estimateTauMs, tickMs } = environment.classificationProgress;
const START_PERCENT = 1;
const DONE_PERCENT = 100;

/**
 * Estado de la barra al clasificar un audio: etapa, porcentaje y error. La subida aporta progreso
 * real; el análisis no tiene dato del servidor, así que avanza estimado y se frena antes de
 * estimateCap hasta que llega la respuesta. El temporizador solo existe mientras hay análisis.
 */
export class ClassificationProgress {
  readonly stage = signal<ClassificationStage | null>(null);
  readonly percent = signal(0);
  readonly error = signal<string | null>(null);
  /** Visible desde que empieza hasta que se navega al resultado o se descarta. */
  readonly active = computed(() => this.stage() !== null);

  private timer?: ReturnType<typeof setInterval>;

  start(): void {
    this.stopEstimate();
    this.error.set(null);
    this.stage.set('uploading');
    this.percent.set(START_PERCENT);
  }

  /** Fracción real (0…1) de la subida a Storage. */
  uploaded(fraction: number): void {
    this.advanceTo(START_PERCENT + (uploadEnd - START_PERCENT) * Math.min(1, Math.max(0, fraction)));
  }

  verifying(): void {
    this.error.set(null);
    this.stage.set('verifying');
    this.advanceTo(uploadEnd);
  }

  verified(): void {
    this.advanceTo(verifyEnd);
  }

  /** Esperando al backend o al motor; `waking` solo cambia el texto, el progreso sigue donde iba. */
  analyzing(waking = false): void {
    this.error.set(null);
    this.stage.set(waking ? 'waking' : 'analyzing');
    this.timer ??= setInterval(() => this.estimateStep(), tickMs);
  }

  complete(): void {
    this.stopEstimate();
    this.stage.set('done');
    this.percent.set(DONE_PERCENT);
  }

  /** La barra queda quieta donde estaba y muestra el error. */
  fail(message: string): void {
    this.stopEstimate();
    this.error.set(message);
  }

  reset(): void {
    this.stopEstimate();
    this.stage.set(null);
    this.error.set(null);
    this.percent.set(0);
  }

  // Me acerco al tope por fracciones cada vez menores: suave, y nunca lo alcanza.
  private estimateStep(): void {
    const step = 1 - Math.exp(-tickMs / estimateTauMs);
    this.percent.update((value) => (value >= estimateCap ? value : value + (estimateCap - value) * step));
  }

  private advanceTo(value: number): void {
    this.percent.update((current) => Math.max(current, value));
  }

  private stopEstimate(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
