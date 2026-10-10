import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  input,
  ChangeDetectionStrategy
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SpectrogramFrame } from '../../../core/services/audio-capture.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SpectrogramPainter } from './spectrogram-painter';
import { LIVE_INTENSITY_GAIN } from './spectrogram-scale';

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
    <canvas #canvas class="w-full h-full block" role="img" [attr.aria-label]="ariaLabelKey() | translate"></canvas>
  `,
})
export class SpectrogramViewComponent implements AfterViewInit, OnDestroy {
  readonly getFrame = input.required<() => SpectrogramFrame | null>();
  /** Visible columns: fewer = wider, more legible bars. */
  readonly columns = input(48);
  /** Where new columns appear until the view fills: centered, or at the right edge like a scrolling sonogram. */
  readonly growFrom = input<'center' | 'end'>('center');
  readonly ariaLabelKey = input('common.spectrogramLabel');
  /** Share of the spectrum drawn, from 0 Hz up (1 = everything the FFT computed). Display only. */
  readonly visibleFraction = input(1);
  /** Columns already on screen when the view starts (e.g. a demo that opens full). */
  readonly initialColumns = input<Float32Array[]>([]);

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private painter?: SpectrogramPainter;
  private rafId?: number;
  private history: Float32Array[] = [];
  // En SSR/prerender no hay canvas real: no se pinta nada.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private readonly zone: NgZone) {
    // Al cambiar de tema, el pintor vuelve a leer los tokens y repinta lo que ya tenía.
    const theme = inject(ThemeService);
    effect(() => {
      theme.resolvedTheme();
      if (this.isBrowser && this.canvasRef) this.resetPainter();
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.history = this.initialColumns().slice(-this.columns());
    this.resetPainter();
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
    if (this.history.length > this.columns()) this.history.shift();
    this.draw();
  }

  private resetPainter(): void {
    this.painter = new SpectrogramPainter(this.canvasRef.nativeElement);
    this.draw();
  }

  private draw(): void {
    const maxColumns = this.columns();
    const free = maxColumns - this.history.length;
    // Mientras no se llena el historial, las columnas nacen centradas o en el borde derecho.
    const firstSlot = this.growFrom() === 'end' ? free : Math.floor(free / 2);
    const visible = SpectrogramPainter.cropToFraction(this.history, this.visibleFraction());
    this.painter?.draw(visible, (magnitude) => magnitude * LIVE_INTENSITY_GAIN, maxColumns, firstSlot);
  }
}
