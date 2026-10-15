import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-live="polite">
      @if (toast.messageKey(); as key) {
        <p class="toast">
          <span class="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">mark_email_read</span>
          {{ key | translate }}
        </p>
      }
    </div>
  `,
  styles: `
    .toast {
      position: fixed;
      z-index: 70;
      inset-inline: var(--space-gutter);
      inset-block-start: calc(var(--space-unit) * 20);
      max-width: calc(var(--space-unit) * 100);
      margin-inline: auto;
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) * 3);
      padding: calc(var(--space-unit) * 4) calc(var(--space-unit) * 5);
      border-radius: var(--radius-lg);
      border-inline-start: calc(var(--space-unit) * 1) solid var(--color-sulfur);
      background: var(--color-surface-container-lowest);
      color: var(--color-on-surface);
      box-shadow: var(--shadow-lg);
      font-weight: 600;
    }
    @media (prefers-reduced-motion: no-preference) {
      .toast {
        animation: toast-in var(--duration-slow) var(--ease-standard);
      }
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(calc(var(--space-unit) * -4));
      }
    }
  `,
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
