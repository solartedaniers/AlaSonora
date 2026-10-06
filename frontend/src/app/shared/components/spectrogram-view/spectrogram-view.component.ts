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
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SpectrogramPainter } from './spectrogram-painter';

// Raw live magnitudes are small; this scales them into the painter's 0..1 range.
const LIVE_INTENSITY_GAIN = 6;

/**
 * Dibuja el espectrograma en un <canvas>.
 *
 * EVENT LOOP — por qué el pintado va en `requestAnimationFrame`:
 * -----------------------------------------------------------------------
 * `AudioCaptureService` actualiza su signal `latestFrame` desde el handler
 * del evento `message` del worker, que es una TASK (ver comentario en ese
 * servicio). Si pintáramos el canvas dentro de ese mismo handler, cada
 * frame de audio (varias veces por segundo) dispararía un dibujo síncrono,
 * compitiendo con cualquier otra interacción del usuario.
 *
 * En cambio, este componente mantiene su propio bucle de rAF: sus
 * callbacks no son tasks, corren en el paso de renderizado del event loop
 * (una vez por refresco de pantalla, tras las tasks y microtasks
 * pendientes) y en cada uno simplemente LEEN el último valor del signal y
 * pintan. Así "recibir datos" (tasks de alta frecuencia) queda desacoplado
 * de "pintar" (máx. ~60 veces por segundo), sin importar cuántos frames de
 * audio lleguen entre repintados.
 */
@Component({
  selector: 'app-spectrogram-view',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <canvas #canvas class="w-full h-full block" [attr.aria-label]="'common.spectrogramLabel' | translate"></canvas>
  `,
})
export class SpectrogramViewComponent implements AfterViewInit, OnDestroy {
  readonly getFrame = input.required<() => SpectrogramFrame | null>();

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private painter?: SpectrogramPainter;
  private rafId?: number;
  private history: Float32Array[] = [];
  // Menos columnas = barras más anchas y visibles (antes 200, casi ilegibles).
  private readonly maxColumns = 48;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.painter = new SpectrogramPainter(this.canvasRef.nativeElement);
    // El bucle de dibujo no necesita disparar detección de cambios de
    // Angular en cada frame — corre fuera de la zona.
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
    this.history.push(frame.magnitudes);
    if (this.history.length > this.maxColumns) this.history.shift();
    // Mientras no se ha llenado el historial, las columnas nacen centradas en
    // el visualizador y crecen hacia los bordes.
    const firstSlot = Math.floor((this.maxColumns - this.history.length) / 2);
    this.painter?.draw(this.history, (magnitude) => magnitude * LIVE_INTENSITY_GAIN, this.maxColumns, firstSlot);
  }
}
