import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { I18nService, AppLang } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-lang-toggle',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="inline-flex items-center rounded-full ring-1 ring-outline-variant" role="group" [attr.aria-label]="'common.langSwitcherLabel' | translate">
      @for (option of options; track option) {
        <button
          type="button"
          class="min-w-touch h-touch px-2 rounded-full font-data text-sm font-semibold transition-colors text-on-surface-variant hover:text-on-surface aria-pressed:bg-sulfur aria-pressed:text-on-sulfur"
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
