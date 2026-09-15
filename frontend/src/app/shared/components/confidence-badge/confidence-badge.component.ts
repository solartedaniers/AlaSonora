import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-confidence-badge',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold"
      [class]="tierClasses()"
    >
      <span class="w-1.5 h-1.5 rounded-full" [class]="dotClasses()"></span>
      {{ roundedValue() }}% {{ 'common.confidence' | translate }}
    </span>
  `,
})
export class ConfidenceBadgeComponent {
  readonly value = input.required<number>();

  // El backend puede devolver la certeza como double sin redondear
  // (p. ej. 98.7579524517059); se muestra siempre como entero.
  readonly roundedValue = computed(() => Math.round(this.value()));

  readonly tier = computed<'high' | 'medium' | 'low'>(() => {
    const v = this.value();
    if (v >= 90) return 'high';
    if (v >= 70) return 'medium';
    return 'low';
  });

  readonly tierClasses = computed(() =>
    this.tier() === 'high'
      ? 'bg-primary/15 text-primary'
      : this.tier() === 'medium'
        ? 'bg-secondary/20 text-secondary'
        : 'bg-surface-container-highest text-on-surface-variant'
  );

  readonly dotClasses = computed(() =>
    this.tier() === 'high'
      ? 'bg-primary animate-pulse'
      : this.tier() === 'medium'
        ? 'bg-secondary'
        : 'bg-outline'
  );
}
