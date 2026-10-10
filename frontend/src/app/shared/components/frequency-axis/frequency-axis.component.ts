import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

const DEFAULT_STEP_KHZ = 4;

/** Vertical kHz axis for a spectrogram that spans 0…maxKhz (bottom to top). */
@Component({
  selector: 'app-frequency-axis',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'frequency-axis', 'aria-hidden': 'true' },
  template: `
    @for (khz of labels(); track khz) {
      <span class="frequency-axis__label" [style.bottom.%]="(khz / maxKhz()) * 100">{{ khz }}</span>
    }
    <span class="frequency-axis__label frequency-axis__label--unit" [style.bottom.%]="100">{{ 'units.khz' | translate }}</span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: calc(var(--space-unit) * 12);
      font-family: var(--font-data);
      font-size: var(--text-xs);
      color: var(--color-on-surface-variant);
      font-feature-settings: 'tnum';
    }
    .frequency-axis__label {
      position: absolute;
      inset-inline-end: calc(var(--space-unit) * 2);
      transform: translateY(50%);
    }
    .frequency-axis__label:not(.frequency-axis__label--unit)::after {
      content: '';
      position: absolute;
      inset-inline-start: calc(100% + var(--space-unit));
      top: 50%;
      width: calc(var(--space-unit) * 1);
      height: 1px;
      background: var(--color-outline);
    }
    .frequency-axis__label--unit {
      color: var(--color-primary);
      font-weight: var(--weight-semibold);
      transform: none;
    }
  `,
})
export class FrequencyAxisComponent {
  readonly maxKhz = input.required<number>();
  readonly stepKhz = input(DEFAULT_STEP_KHZ);

  readonly labels = computed(() => {
    const labels: number[] = [];
    for (let khz = this.stepKhz(); khz < this.maxKhz(); khz += this.stepKhz()) labels.push(khz);
    return labels;
  });
}
