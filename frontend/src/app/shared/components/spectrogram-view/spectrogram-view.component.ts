import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  input,
} from '@angular/core';
import { SpectrogramFrame } from '../../../core/services/audio-capture.service';

/**
 * Dibuja el espectrograma en un <canvas>.
 *
 * EVENT LOOP — por qué el pintado va en `requestAnimationFrame` (TASK):
 * -----------------------------------------------------------------------
 * `AudioCaptureService` actualiza su signal `latestFrame` desde el
 * callback del worker, que se resuelve como MICROTASK (ver comentario en
 * ese servicio). Si pintáramos el canvas directamente dentro de ese mismo
 * callback, cada frame de audio (varias veces por segundo) dispararía un
 * layout/paint síncrono, compitiendo con cualquier otra interacción del
 * usuario y arriesgando bloquear el hilo principal.
 *
 * En cambio, este componente mantiene su propio bucle de rAF (una TASK
 * calendarizada por el navegador, sincronizada con el refresco de
 * pantalla) que, en cada frame visual, simplemente LEE el último valor
 * disponible del signal y pinta. Así el trabajo de "recibir datos"
 * (microtasks, alta frecuencia) queda desacoplado del trabajo de "pintar"
 * (tasks, limitado a ~60fps), garantizando una interfaz fluida sin
 * importar cuántos frames de audio lleguen entre repintados.
 */
@Component({
  selector: 'app-spectrogram-view',
  standalone: true,
  template: `
    <canvas #canvas class="w-full h-full block" [attr.aria-label]="ariaLabel()"></canvas>
  `,
})
export class SpectrogramViewComponent implements AfterViewInit, OnDestroy {
  readonly getFrame = input.required<() => SpectrogramFrame | null>();
  readonly ariaLabel = input('Espectrograma en tiempo real');

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx?: CanvasRenderingContext2D | null;
  private rafId?: number;
  private history: Float32Array[] = [];
  private readonly maxColumns = 200;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.clientWidth || 600;
    canvas.height = canvas.clientHeight || 200;
    this.ctx = canvas.getContext('2d');

    // El bucle de dibujo no necesita disparar detección de cambios de
    // Angular en cada frame — corre fuera de la zona (TASK pura de rAF).
    this.zone.runOutsideAngular(() => this.loop());
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private loop = (): void => {
    const frame = this.getFrame()();
    if (frame) this.pushAndDraw(frame);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private pushAndDraw(frame: SpectrogramFrame): void {
    if (!this.ctx) return;
    this.history.push(frame.magnitudes);
    if (this.history.length > this.maxColumns) this.history.shift();

    const canvas = this.canvasRef.nativeElement;
    const { width, height } = canvas;
    this.ctx.fillStyle = '#03110c';
    this.ctx.fillRect(0, 0, width, height);

    const colWidth = width / this.maxColumns;
    this.history.forEach((magnitudes, colIndex) => {
      const rowHeight = height / magnitudes.length;
      for (let bin = 0; bin < magnitudes.length; bin++) {
        const intensity = Math.min(1, magnitudes[bin] * 6);
        this.ctx!.fillStyle = this.heatColor(intensity);
        this.ctx!.fillRect(
          colIndex * colWidth,
          height - bin * rowHeight - rowHeight,
          colWidth + 0.5,
          rowHeight + 0.5
        );
      }
    });
  }

  /** Degradado térmico: azul oscuro -> verde -> naranja -> amarillo, como en el diseño Stitch. */
  private heatColor(t: number): string {
    const stops: [number, [number, number, number]][] = [
      [0, [3, 17, 12]],
      [0.3, [45, 106, 79]],
      [0.6, [149, 212, 179]],
      [0.85, [249, 199, 79]],
      [1, [255, 183, 3]],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [p0, c0] = stops[i];
      const [p1, c1] = stops[i + 1];
      if (t >= p0 && t <= p1) {
        const localT = (t - p0) / (p1 - p0 || 1);
        const r = Math.round(c0[0] + (c1[0] - c0[0]) * localT);
        const g = Math.round(c0[1] + (c1[1] - c0[1]) * localT);
        const b = Math.round(c0[2] + (c1[2] - c0[2]) * localT);
        return `rgb(${r},${g},${b})`;
      }
    }
    return 'rgb(255,183,3)';
  }
}
