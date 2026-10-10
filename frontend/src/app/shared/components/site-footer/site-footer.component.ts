import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative z-10 block w-full' },
  template: `
    <footer class="w-full border-t px-gutter py-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-on-surface-variant">
      <span class="font-data">© {{ year }} {{ 'app.name' | translate }}</span>
      <span class="w-4 h-1 rounded-xs bg-sulfur" aria-hidden="true"></span>
      <span>{{ 'footer.rights' | translate }}</span>
    </footer>
  `,
})
export class SiteFooterComponent {
  readonly year = new Date().getFullYear();
}
