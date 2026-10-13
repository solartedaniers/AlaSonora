import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SonogramGlyphComponent } from '../sonogram-glyph/sonogram-glyph.component';
import { I18nService } from '../../../core/services/i18n.service';
import { MotionPreferenceService } from '../../../core/services/motion-preference.service';

export interface SpiralItem {
  imageUrl: string;
  commonName: string;
  scientificName: string;
}

const FULL_TURN_DEG = 360;
const SEEK_DURATION_MS = 480;
// Separación extra entre marcos, en fracciones del ancho del marco.
const RING_GAP_FACTOR = 0.3;
const MIN_RADIUS_FACTOR = 0.75;
const EMPTY_FRAME_COUNT = 5;

/**
 * Anillo 3D de especies ("Especies destacadas"). El giro es la animación CSS original
 * (rotateY + translateZ + perspective); esta clase solo la lee y la desplaza con la
 * Web Animations API para saber qué especie queda al frente y llevar a la elegida.
 */
@Component({
  selector: 'app-infinite-spiral',
  standalone: true,
  imports: [TranslatePipe, SonogramGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './infinite-spiral.component.html',
  styleUrl: './infinite-spiral.component.scss',
})
export class InfiniteSpiralComponent implements AfterViewInit, OnDestroy {
  readonly items = input.required<SpiralItem[]>();
  readonly labelKey = input('dashboard.spotlight.region');

  readonly motion = inject(MotionPreferenceService);
  private readonly i18n = inject(I18nService);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  readonly frontIndex = signal(0);
  readonly announcement = signal('');

  readonly isEmpty = computed(() => this.items().length === 0);
  /** Sin datos el anillo gira con marcos vacíos: nunca invento especies. */
  readonly frameCount = computed(() => (this.isEmpty() ? EMPTY_FRAME_COUNT : this.items().length));
  readonly emptyFrames = Array.from({ length: EMPTY_FRAME_COUNT }, (_, i) => i);
  readonly front = computed(() => this.items()[this.frontIndex()] ?? null);
  /** Radio para que los marcos no se monten: r = w / (2·tan(π/n)), más un espacio. */
  readonly radiusFactor = computed(() => {
    const n = this.frameCount();
    return n < 3 ? MIN_RADIUS_FACTOR : 1 / (2 * Math.tan(Math.PI / n)) + RING_GAP_FACTOR;
  });

  private watchFrameId?: number;
  private seekFrameId?: number;

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    // Leer el ángulo en cada frame no necesita detección de cambios de Angular.
    this.zone.runOutsideAngular(() => this.watchFront());
  }

  ngOnDestroy(): void {
    if (this.watchFrameId) cancelAnimationFrame(this.watchFrameId);
    if (this.seekFrameId) cancelAnimationFrame(this.seekFrameId);
  }

  next(): void {
    this.goTo(this.frontIndex() + 1);
  }

  previous(): void {
    this.goTo(this.frontIndex() - 1);
  }

  goTo(index: number): void {
    const n = this.items().length;
    if (n === 0) return;
    const target = ((index % n) + n) % n;
    const animation = this.spinAnimation();
    if (animation) this.seek(animation, target);
    this.frontIndex.set(target);
    this.announce(target);
  }

  onKeydown(event: KeyboardEvent): void {
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.next(),
      ArrowLeft: () => this.previous(),
      Home: () => this.goTo(0),
      End: () => this.goTo(this.items().length - 1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  private announce(index: number): void {
    const item = this.items()[index];
    const position = `${index + 1} ${this.i18n.translate('dashboard.spotlight.of')} ${this.items().length}`;
    this.announcement.set(`${position}: ${item.commonName}, ${item.scientificName}`);
  }

  /** La animación CSS del anillo; no existe con movimiento reducido ni antes de renderizar. */
  private spinAnimation(): Animation | null {
    if (this.motion.reduced()) return null;
    return this.track()?.nativeElement.getAnimations()[0] ?? null;
  }

  private watchFront = (): void => {
    const animation = this.spinAnimation();
    const n = this.items().length;
    if (animation && n > 0) {
      const index = this.indexFacingViewer(animation, n);
      if (index !== this.frontIndex()) this.zone.run(() => this.frontIndex.set(index));
    }
    this.watchFrameId = requestAnimationFrame(this.watchFront);
  };

  private indexFacingViewer(animation: Animation, n: number): number {
    const duration = this.durationOf(animation);
    const angle = ((Number(animation.currentTime) % duration) / duration) * FULL_TURN_DEG;
    return Math.round(angle / (FULL_TURN_DEG / n)) % n;
  }

  /** Llevo la misma animación CSS, con suavidad, al instante en que `index` queda al frente. */
  private seek(animation: Animation, index: number): void {
    const duration = this.durationOf(animation);
    const step = FULL_TURN_DEG / this.items().length;
    const targetTime = ((index * step) / FULL_TURN_DEG) * duration;
    const from = Number(animation.currentTime) % duration;
    let delta = targetTime - from;
    // Siempre por el camino más corto alrededor del anillo.
    if (delta > duration / 2) delta -= duration;
    if (delta < -duration / 2) delta += duration;

    if (this.seekFrameId) cancelAnimationFrame(this.seekFrameId);
    const startedAt = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / SEEK_DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      animation.currentTime = (from + delta * eased + duration) % duration;
      if (progress < 1) this.seekFrameId = requestAnimationFrame(tick);
    };
    this.zone.runOutsideAngular(() => (this.seekFrameId = requestAnimationFrame(tick)));
  }

  private durationOf(animation: Animation): number {
    return Number(animation.effect?.getComputedTiming().duration);
  }
}
