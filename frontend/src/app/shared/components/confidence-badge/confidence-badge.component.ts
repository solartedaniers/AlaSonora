import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

type ConfidenceTier = 'high' | 'medium' | 'low';

const HIGH_THRESHOLD = 90;
const MEDIUM_THRESHOLD = 70;
const LEVEL_BARS = [1, 2, 3];
// Barras encendidas por nivel: la confianza también se lee por forma, no solo por color.
const LIT_BARS: Record<ConfidenceTier, number> = { high: 3, medium: 2, low: 1 };

@Component({
  selector: 'app-confidence-badge',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 font-data text-sm font-semibold" [class]="tierClasses()">
      <span class="inline-flex items-end gap-0.5 h-3.5" aria-hidden="true">
        @for (bar of bars; track bar) {
          <span class="w-1 rounded-xs" [class]="bar <= litBars() ? 'bg-current' : 'bg-outline-variant'" [style.height.%]="bar * 33"></span>
        }
      </span>
      {{ roundedValue() }}{{ 'units.percent' | translate }} · {{ ('common.confidenceTier.' + tier()) | translate }}
    </span>
  `,
})
export class ConfidenceBadgeComponent {
  readonly value = input.required<number>();

  readonly bars = LEVEL_BARS;

  // El backend puede devolver la certeza como double sin redondear
  // (p. ej. 98.7579524517059); se muestra siempre como entero.
  readonly roundedValue = computed(() => Math.round(this.value()));

  readonly tier = computed<ConfidenceTier>(() => {
    const v = this.value();
    if (v >= HIGH_THRESHOLD) return 'high';
    if (v >= MEDIUM_THRESHOLD) return 'medium';
    return 'low';
  });

  readonly litBars = computed(() => LIT_BARS[this.tier()]);

  readonly tierClasses = computed(() => {
    const classes: Record<ConfidenceTier, string> = {
      high: 'bg-success-container text-on-success-container',
      medium: 'bg-warning-container text-on-warning-container',
      low: 'bg-surface-container-high text-on-surface-variant',
    };
    return classes[this.tier()];
  });
}
