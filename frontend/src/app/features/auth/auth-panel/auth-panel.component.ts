import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SongSonogramComponent } from '../../../shared/components/song-sonogram/song-sonogram.component';

/** Panel lateral en tinta común a las pantallas de acceso (solo escritorio). */
@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [TranslatePipe, SongSonogramComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout__panel chrome sing-on-hover' },
  template: `
    <div class="flex flex-col gap-5">
      <p class="eyebrow-label">{{ 'app.tagline' | translate }}</p>
      <p class="text-5xl font-display font-extrabold tracking-display leading-tight">{{ 'auth.panel.title' | translate }}</p>
      <p class="max-w-sm text-on-surface-variant leading-relaxed">{{ 'auth.panel.body' | translate }}</p>
    </div>
    <app-song-sonogram class="auth-layout__panel-sonogram" [band]="false" />
  `,
})
export class AuthPanelComponent {}
