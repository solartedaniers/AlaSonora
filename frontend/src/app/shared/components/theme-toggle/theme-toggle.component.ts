import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="inline-flex items-center rounded-full ring-1 ring-outline-variant" role="group" [attr.aria-label]="'theme.switcherLabel' | translate">
      @for (option of options; track option.mode) {
        <button
          type="button"
          class="w-touch h-touch grid place-items-center rounded-full transition-colors text-on-surface-variant hover:text-on-surface aria-pressed:bg-sulfur aria-pressed:text-on-sulfur"
          [attr.aria-pressed]="theme.mode() === option.mode"
          [attr.aria-label]="option.labelKey | translate"
          [title]="option.labelKey | translate"
          (click)="theme.setMode(option.mode)"
        >
          <span class="material-symbols-outlined text-xl" aria-hidden="true">{{ option.icon }}</span>
        </button>
      }
    </div>
  `,
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);

  readonly options: { mode: ThemeMode; icon: string; labelKey: string }[] = [
    { mode: 'light', icon: 'light_mode', labelKey: 'theme.light' },
    { mode: 'dark', icon: 'dark_mode', labelKey: 'theme.dark' },
    { mode: 'system', icon: 'brightness_auto', labelKey: 'theme.system' },
  ];
}
