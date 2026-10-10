import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

const BAR_COUNT = 7;

/** Loading indicator in the app's language: a small sonogram "listening" while data arrives. */
@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'state-panel', role: 'status' },
  template: `
    <span class="loading-bars" aria-hidden="true">
      @for (bar of bars; track bar) {
        <span [style.--bar]="bar"></span>
      }
    </span>
    <p class="text-on-surface-variant">{{ labelKey() | translate }}</p>
  `,
  styles: `
    .loading-bars {
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) * 1.5);
      height: calc(var(--space-unit) * 14);
    }
    .loading-bars > span {
      width: calc(var(--space-unit) * 2);
      height: 30%;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      animation: loading-listen var(--duration-pulse) var(--ease-in-out) infinite;
      animation-delay: calc(var(--bar) * 110ms);
    }
    .loading-bars > span:nth-child(4) {
      background: var(--color-sulfur);
    }
    @keyframes loading-listen {
      50% {
        height: 100%;
      }
    }
  `,
})
export class LoadingStateComponent {
  readonly labelKey = input('common.loading');
  readonly bars = Array.from({ length: BAR_COUNT }, (_, i) => i);
}
