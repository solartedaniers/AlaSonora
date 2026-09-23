import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  input,
  ChangeDetectionStrategy
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
  changeDetection: ChangeDetectionStrategy.Eager,
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
  // Menos columnas = barras más anchas y visibles (antes 200, casi ilegibles).
  private readonly maxColumns = 48;
  private hotColor: [number, number, number] = [234, 190, 154];
  private peakColor: [number, number, number] = [255, 180, 171];

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.clientWidth || 600;
    canvas.height = canvas.clientHeight || 200;
    this.ctx = canvas.getContext('2d');

    // Colores rojo/naranja tomados de los tokens de tema (--color-secondary,
    // --color-error) en vez de hex sueltos, para que el degradado siga la
    // paleta activa (claro/oscuro) sin duplicar valores aquí.
    const styles = getComputedStyle(document.documentElement);
    this.hotColor = this.parseHex(styles.getPropertyValue('--color-secondary')) ?? this.hotColor;
    this.peakColor = this.parseHex(styles.getPropertyValue('--color-error')) ?? this.peakColor;

    // El bucle de dibujo no necesita disparar detección de cambios de
    // Angular en cada frame — corre fuera de la zona (TASK pura de rAF).
    this.zone.runOutsideAngular(() => this.loop());
  }

  private parseHex(hex: string): [number, number, number] | null {
    const match = hex.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return null;
    const value = match[1];
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
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
    // Mientras no se ha llenado el historial, las columnas nacen centradas en
    // el visualizador y crecen hacia los bordes, en vez de quedar pegadas a
    // la izquierda con un vacío incómodo a la derecha.
    const startCol = Math.floor((this.maxColumns - this.history.length) / 2);
    this.history.forEach((magnitudes, colIndex) => {
      const rowHeight = height / magnitudes.length;
      const x = (startCol + colIndex) * colWidth;
      for (let bin = 0; bin < magnitudes.length; bin++) {
        const intensity = Math.min(1, magnitudes[bin] * 6);
        this.ctx!.fillStyle = this.heatColor(intensity);
        this.ctx!.fillRect(x, height - bin * rowHeight - rowHeight, colWidth + 0.5, rowHeight + 0.5);
      }
    });
  }

  /** Degradado rojo/naranja (tokens --color-secondary / --color-error) sobre el fondo oscuro del lienzo. */
  private heatColor(t: number): string {
    const [r0, g0, b0] = [3, 17, 12];
    if (t <= 0.35) {
      const localT = t / 0.35;
      return `rgb(${Math.round(r0 + (this.hotColor[0] - r0) * localT)},${Math.round(g0 + (this.hotColor[1] - g0) * localT)},${Math.round(b0 + (this.hotColor[2] - b0) * localT)})`;
    }
    const localT = (t - 0.35) / 0.65;
    return `rgb(${Math.round(this.hotColor[0] + (this.peakColor[0] - this.hotColor[0]) * localT)},${Math.round(this.hotColor[1] + (this.peakColor[1] - this.hotColor[1]) * localT)},${Math.round(this.hotColor[2] + (this.peakColor[2] - this.hotColor[2]) * localT)})`;
  }
}
