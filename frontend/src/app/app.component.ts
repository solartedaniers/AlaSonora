import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlowCursorComponent } from './shared/components/glow-cursor/glow-cursor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlowCursorComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-glow-cursor />
    <router-outlet />
  `,
})
export class AppComponent {}
