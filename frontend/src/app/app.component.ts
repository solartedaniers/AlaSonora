import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlowCursorComponent } from './shared/components/glow-cursor/glow-cursor.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlowCursorComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (theme.resolvedTheme() === 'dark') {
      <app-glow-cursor />
    }
    <router-outlet />
  `,
})
export class AppComponent {
  readonly theme = inject(ThemeService);
}
