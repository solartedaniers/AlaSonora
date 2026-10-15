import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SpectrogramFrame } from '../../../core/services/audio-capture.service';
import { FrameHistory } from '../../../core/services/frame-history';
import { ThemeService } from '../../../core/services/theme.service';
import { I18nService } from '../../../core/services/i18n.service';
import { MotionPreferenceService } from '../../../core/services/motion-preference.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LIVE_INTENSITY_GAIN } from '../spectrogram-view/spectrogram-scale';
import { SpectrogramPainter } from '../spectrogram-view/spectrogram-painter';
import { WaterfallAxis, WaterfallPainter } from './waterfall-painter';

// Suavizado del periodo entre columnas: estima cuánto avanzar entre una y otra.
const PERIOD_SMOOTHING = 0.15;
const DEFAULT_PERIOD_MS = 20;
const MS_PER_SECOND = 1000;

/**
 * Vista 3D en cascada de los frames del espectrograma.
 *
 * Igual que SpectrogramViewComponent: el bucle de requestAnimationFrame solo
 * LEE el último frame disponible y pinta; nunca pinta dentro de un mensaje,
 * así recibir datos y dibujar quedan desacoplados.
 */
@Component({
  selector: 'app-spectrogram-waterfall',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<canvas #canvas class="block w-full h-full" role="img" [attr.aria-label]="ariaLabelKey() | translate"></canvas>`,
})
export class SpectrogramWaterfallComponent implements AfterViewInit, OnDestroy {
  readonly getFrame = input<() => SpectrogramFrame | null>(() => null);
  /** Historial compartido de la grabación: si llega, pinto desde él en vez de acumular mi propia copia. */
  readonly frameHistory = input<FrameHistory | null>(null);
  /** Filas ya en pantalla al iniciar la vista, la más antigua primero. */
  readonly initialColumns = input<Float32Array[]>([]);
  readonly rows = input(56);
  readonly maxKhz = input.required<number>();
  readonly stepKhz = input(2);
  /** Segundos mostrados de frente a fondo; sin él, lo derivo de la tasa de frames medida (audio en vivo). */
  readonly windowSeconds = input<number | null>(null);
  /** Fracción del espectro dibujada desde 0 Hz (recorte solo visual). */
  readonly visibleFraction = input(1);
  readonly stepSeconds = input(1);
  readonly ariaLabelKey = input('common.spectrogramLabel');

  private readonly zone = inject(NgZone);
  private readonly i18n = inject(I18nService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private painter?: WaterfallPainter;
  private history: Float32Array[] = [];
  private lastFrame: SpectrogramFrame | null = null;
  private lastRevision = -1;
  private rafId?: number;
  private lastPushAt = 0;
  private periodMs = DEFAULT_PERIOD_MS;
  private resizeObserver?: ResizeObserver;

  constructor() {
    const theme = inject(ThemeService);
    // Al cambiar de tema, el pintor vuelve a leer los tokens y repinta.
    effect(() => {
      theme.resolvedTheme();
      if (this.painter) this.resetPainter();
    });
    // Con "reduced motion" la cascada queda quieta: un solo dibujo, sin bucle.
    effect(() => {
      const reduced = this.motion.reduced();
      if (!this.painter) return;
      this.stopLoop();
      if (reduced) this.paint(0);
      else this.startLoop();
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.history = this.frameHistory()?.latest(this.rows()) ?? this.initialColumns().slice(-this.rows());
    this.lastRevision = this.frameHistory()?.revision ?? -1;
    this.resetPainter();
    this.resizeObserver = new ResizeObserver(() => {
      this.painter?.resize();
      this.paint(0);
    });
    this.resizeObserver.observe(this.canvas().nativeElement);
    if (!this.motion.reduced()) this.startLoop();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.resizeObserver?.disconnect();
  }

  private resetPainter(): void {
    this.painter = new WaterfallPainter(this.canvas().nativeElement);
    this.paint(0);
  }

  private startLoop(): void {
    this.zone.runOutsideAngular(() => (this.rafId = requestAnimationFrame(this.loop)));
  }

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
  }

  private loop = (now: number): void => {
    const shared = this.frameHistory();
    if (shared) {
      // Solo leo: el historial lo llena el servicio de captura al recibir cada mensaje del worker.
      if (shared.revision !== this.lastRevision) {
        this.lastRevision = shared.revision;
        this.history = shared.latest(this.rows());
        this.measurePeriod(now);
      }
    } else {
      const frame = this.getFrame()();
      // Una fila por frame nuevo: el audio en vivo devuelve el mismo frame hasta que llega otro.
      if (frame && frame !== this.lastFrame) {
        this.lastFrame = frame;
        this.push(frame.magnitudes, now);
      }
    }
    const advance = Math.min(1, (now - this.lastPushAt) / this.periodMs);
    this.paint(advance);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private push(magnitudes: Float32Array, now: number): void {
    this.measurePeriod(now);
    this.history.push(magnitudes);
    if (this.history.length > this.rows()) this.history.shift();
  }

  /** Tiempo entre filas nuevas, suavizado: marca cuánto avanza la cascada entre una y otra. */
  private measurePeriod(now: number): void {
    if (this.lastPushAt) this.periodMs += ((now - this.lastPushAt) - this.periodMs) * PERIOD_SMOOTHING;
    this.lastPushAt = now;
  }

  private paint(advance: number): void {
    const visible = SpectrogramPainter.cropToFraction(this.history, this.visibleFraction());
    this.painter?.draw(visible, this.rows(), advance, (magnitude) => magnitude * LIVE_INTENSITY_GAIN, this.axis());
  }

  private axis(): WaterfallAxis {
    return {
      maxKhz: this.maxKhz(),
      stepKhz: this.stepKhz(),
      windowSeconds: this.windowSeconds() ?? Math.max(1, Math.floor((this.rows() * this.periodMs) / MS_PER_SECOND)),
      stepSeconds: this.stepSeconds(),
      khzUnit: this.i18n.translate('units.khz'),
      secondsAgo: this.i18n.translate('units.secondsAgo'),
      nowLabel: this.i18n.translate('units.now'),
    };
  }
}
