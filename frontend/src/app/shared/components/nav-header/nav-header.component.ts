import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../lang-toggle/lang-toggle.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-nav-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent, LangToggleComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header class="w-full bg-surface-container-low/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
      <a routerLink="/" class="flex items-center gap-2.5 shrink-0">
        <span class="material-symbols-outlined text-primary text-[26px]">graphic_eq</span>
        <span class="font-display font-bold text-on-surface tracking-tight text-lg leading-none">
          Ala<span class="text-primary">Sonora</span>
        </span>
      </a>

      <nav class="hidden md:flex items-center gap-1">
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-surface-container-high text-primary shadow-inner"
            class="px-3 py-2 rounded-lg font-display text-sm text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[18px]">{{ item.icon }}</span>
            <span>{{ item.labelKey | translate }}</span>
          </a>
        }
      </nav>

      <div class="flex items-center gap-3">
        <app-lang-toggle />
        <app-theme-toggle />
        <img
          [src]="user.currentUser().avatarUrl || 'assets/avatars/default.jpg'"
          [alt]="user.currentUser().fullName"
          class="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-primary/30 hidden sm:block"
          onerror="this.style.display='none'"
        />
      </div>
    </header>
  `,
})
export class NavHeaderComponent {
  readonly user = inject(UserService);

  readonly navItems = [
    { path: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' },
    { path: '/record', icon: 'graphic_eq', labelKey: 'nav.record' },
    { path: '/history', icon: 'library_music', labelKey: 'nav.history' },
    { path: '/map', icon: 'map', labelKey: 'nav.map' },
    { path: '/profile', icon: 'person', labelKey: 'nav.profile' },
  ];
}
