import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlowCursorComponent } from './shared/components/glow-cursor/glow-cursor.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlowCursorComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  // @defer (on idle): el cursor WebGL (librería ogl) es puramente decorativo,
  // así que sale del bundle inicial y nunca se renderiza en el servidor
  // (usa window/WebGL); se carga cuando el navegador queda ocioso.
  template: `
    @defer (on idle) {
      @if (theme.resolvedTheme() === 'dark') {
        <app-glow-cursor />
      }
    }
    <router-outlet />
  `,
})
export class AppComponent {
  readonly theme = inject(ThemeService);
}
