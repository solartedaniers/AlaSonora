import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { I18nService, AppLang } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-lang-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex items-center bg-surface-container-lowest p-1 rounded-full" role="group" aria-label="Language switcher">
      @for (option of options; track option) {
        <button
          type="button"
          class="px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold transition-all"
          [class.bg-surface-container-high]="i18n.lang() === option"
          [class.text-primary]="i18n.lang() === option"
          [class.text-on-surface-variant]="i18n.lang() !== option"
          [attr.aria-pressed]="i18n.lang() === option"
          (click)="i18n.setLang(option)"
        >
          {{ option.toUpperCase() }}
        </button>
      }
    </div>
  `,
})
export class LangToggleComponent {
  readonly i18n = inject(I18nService);
  readonly options: AppLang[] = ['es', 'en'];
}
