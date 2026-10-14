import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AppUpdateService } from '../../../core/services/app-update.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Aviso flotante de versión nueva: actualizar ahora o seguir y hacerlo después. */
@Component({
  selector: 'app-update-prompt',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-live="polite">
      @if (updates.updateReady()) {
        <div role="status" class="update-prompt">
          <span class="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">refresh</span>
          <p class="update-prompt__text">
            <strong class="block">{{ 'update.title' | translate }}</strong>
            {{ 'update.body' | translate }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn--quiet px-4" (click)="updates.dismiss()">{{ 'update.later' | translate }}</button>
            <button type="button" class="btn btn--ink px-4" (click)="updates.applyUpdate()">{{ 'update.apply' | translate }}</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .update-prompt {
      position: fixed;
      z-index: 60;
      inset-inline: var(--space-gutter);
      inset-block-end: var(--space-gutter);
      max-width: calc(var(--space-unit) * 120);
      margin-inline: auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: calc(var(--space-unit) * 3) calc(var(--space-unit) * 4);
      padding: calc(var(--space-unit) * 4) calc(var(--space-unit) * 5);
      border-radius: var(--radius-lg);
      border-inline-start: calc(var(--space-unit) * 1) solid var(--color-sulfur);
      background: var(--color-surface-container-lowest);
      color: var(--color-on-surface);
      box-shadow: var(--shadow-lg);
      font-size: var(--text-sm);
    }
    .update-prompt__text {
      flex: 1 1 calc(var(--space-unit) * 60);
      min-width: 0;
    }
    @media (prefers-reduced-motion: no-preference) {
      .update-prompt {
        animation: update-prompt-in var(--duration-slow) var(--ease-standard);
      }
    }
    @keyframes update-prompt-in {
      from {
        opacity: 0;
        transform: translateY(calc(var(--space-unit) * 4));
      }
    }
  `,
})
export class UpdatePromptComponent {
  readonly updates = inject(AppUpdateService);
}
