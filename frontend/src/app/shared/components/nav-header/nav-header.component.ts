import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../lang-toggle/lang-toggle.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SpeciesNamePipe } from '../../pipes/species-name.pipe';
import { UserService } from '../../../core/services/user.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AdminAccessService } from '../../../core/services/admin-access.service';

@Component({
  selector: 'app-nav-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent, LangToggleComponent, TranslatePipe, SpeciesNamePipe],
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
        @for (item of navItems(); track item.path) {
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

        <button
          type="button"
          class="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
          [attr.aria-label]="'nav.menu' | translate"
          (click)="mobileMenuOpen.update((open) => !open)"
        >
          <span class="material-symbols-outlined text-on-surface-variant text-[22px]">
            {{ mobileMenuOpen() ? 'close' : 'menu' }}
          </span>
        </button>

        <div class="relative">
          <button
            type="button"
            class="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
            [attr.aria-label]="'notifications.title' | translate"
            (click)="toggleNotifications()"
          >
            <span class="material-symbols-outlined text-on-surface-variant text-[22px]">notifications</span>
            @if (notifications.unseenCount() > 0) {
              <span class="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-error text-on-error text-[10px] leading-[16px] font-bold text-center">
                {{ notifications.unseenCount() }}
              </span>
            }
          </button>

          @if (notificationsOpen()) {
            <div class="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-surface-container-low rounded-xl shadow-lg ring-1 ring-outline-variant/30 z-50">
              <p class="px-4 py-2.5 font-display font-semibold text-sm border-b border-outline-variant/20">
                {{ 'notifications.title' | translate }}
              </p>
              @if (notifications.notifications().length === 0) {
                <p class="px-4 py-6 text-sm text-on-surface-variant text-center">
                  {{ 'notifications.empty' | translate }}
                </p>
              } @else {
                @for (item of notifications.notifications(); track item.id) {
                  <div class="px-4 py-2.5 border-b border-outline-variant/10 last:border-0">
                    <p class="text-sm font-medium">{{ item.species | speciesName }}</p>
                    <p class="text-xs text-on-surface-variant">{{ item.observerName }} · {{ item.location.placeName }}</p>
                  </div>
                }
              }
            </div>
          }
        </div>

        <img
          [src]="user.currentUser()?.avatarUrl || 'assets/avatars/default.jpg'"
          [alt]="user.currentUser()?.fullName ?? ''"
          class="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-primary/30 hidden sm:block"
          onerror="this.style.display='none'"
        />
      </div>
    </header>

    @if (mobileMenuOpen()) {
      <nav class="md:hidden w-full bg-surface-container-low border-t border-outline-variant/20 px-4 py-2 sticky top-[60px] z-30 shadow-sm">
        @for (item of navItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-surface-container-high text-primary"
            class="px-3 py-2.5 rounded-lg font-display text-sm text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2.5"
            (click)="mobileMenuOpen.set(false)"
          >
            <span class="material-symbols-outlined text-[18px]">{{ item.icon }}</span>
            <span>{{ item.labelKey | translate }}</span>
          </a>
        }
      </nav>
    }
  `,
})
export class NavHeaderComponent {
  readonly user = inject(UserService);
  readonly notifications = inject(NotificationsService);
  readonly adminAccess = inject(AdminAccessService);

  readonly notificationsOpen = signal(false);
  readonly mobileMenuOpen = signal(false);

  private readonly allNavItems = [
    { path: '/dashboard', icon: 'home', labelKey: 'nav.dashboard', protected: true, adminOnly: false },
    { path: '/record', icon: 'graphic_eq', labelKey: 'nav.record', protected: true, adminOnly: false },
    { path: '/history', icon: 'library_music', labelKey: 'nav.history', protected: true, adminOnly: false },
    { path: '/map', icon: 'map', labelKey: 'nav.map', protected: false, adminOnly: false },
    { path: '/profile', icon: 'person', labelKey: 'nav.profile', protected: true, adminOnly: false },
    { path: '/admin', icon: 'shield_person', labelKey: 'nav.admin', protected: true, adminOnly: true },
  ];

  readonly navItems = computed(() =>
    this.allNavItems.filter((item) => {
      if (item.adminOnly) return this.adminAccess.isAdmin();
      return item.protected ? !!this.user.currentUser() : true;
    }),
  );

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
    if (this.notificationsOpen()) this.notifications.markSeen();
  }
}
