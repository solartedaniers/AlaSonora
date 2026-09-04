import { Component, inject } from '@angular/core';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="flex items-center bg-surface-container-lowest p-1 rounded-full" role="group" aria-label="Selector de tema">
      @for (option of options; track option.mode) {
        <button
          type="button"
          class="p-1.5 rounded-full transition-colors"
          [class.bg-surface-container-high]="theme.mode() === option.mode"
          [class.text-primary]="theme.mode() === option.mode"
          [class.text-on-surface-variant]="theme.mode() !== option.mode"
          [attr.aria-pressed]="theme.mode() === option.mode"
          [title]="option.labelKey | translate"
          (click)="theme.setMode(option.mode)"
        >
          <span class="material-symbols-outlined text-[18px] block">{{ option.icon }}</span>
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
