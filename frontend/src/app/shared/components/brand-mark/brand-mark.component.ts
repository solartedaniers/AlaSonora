import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SonogramGlyphComponent } from '../sonogram-glyph/sonogram-glyph.component';

/** App logo: a three-note sonogram glyph (the loudest note in sulfur) plus the wordmark. */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  imports: [RouterLink, TranslatePipe, SonogramGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <a routerLink="/" class="inline-flex items-center gap-2 min-h-touch rounded-md text-on-surface">
      <app-sonogram-glyph class="w-7 h-6 shrink-0" />
      <span class="font-display text-lg sm:text-xl font-extrabold tracking-display leading-none">{{ 'app.name' | translate }}</span>
    </a>
  `,
})
export class BrandMarkComponent {}
