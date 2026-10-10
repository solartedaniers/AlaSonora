import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** App logo: a three-note sonogram glyph (the loudest note in sulfur) plus the wordmark. */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <a routerLink="/" class="inline-flex items-center gap-2 min-h-touch rounded-md text-on-surface">
      <svg viewBox="0 0 28 24" class="w-7 h-6 shrink-0 fill-none" stroke-linecap="round" aria-hidden="true">
        <path d="M3 9 Q6 5 9 12" class="stroke-current" stroke-width="2.6" />
        <path d="M11 6 Q15 2 18 15" class="stroke-sulfur" stroke-width="3.4" />
        <path d="M20 13 Q23 9 25 17" class="stroke-current" stroke-width="2.2" />
      </svg>
      <span class="font-display text-lg sm:text-xl font-extrabold tracking-display leading-none">{{ 'app.name' | translate }}</span>
    </a>
  `,
})
export class BrandMarkComponent {}
