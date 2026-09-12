import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Anima un número desde 0 hasta `value` cuando el componente entra en
 * viewport (IntersectionObserver), en lugar de al cargar la página —
 * evita animar métricas fuera de pantalla (landing stats, impacto de perfil).
 */
@Component({
  selector: 'app-count-up',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<span>{{ formatted() }}</span>`,
})
export class CountUpComponent implements AfterViewInit, OnDestroy {
  readonly value = input.required<number>();
  readonly decimals = input(0);
  readonly durationMs = input(1500);
  readonly suffix = input('');

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly displayed = signal(0);
  private observer?: IntersectionObserver;
  private rafId?: number;
  private started = false;

  readonly formatted = computed(
    () => `${this.displayed().toFixed(this.decimals())}${this.suffix()}`,
  );

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) this.start();
    });
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    const target = this.value();
    const duration = this.durationMs();
    const startTime = performance.now();

    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayed.set(target * eased);
      if (progress < 1) this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
