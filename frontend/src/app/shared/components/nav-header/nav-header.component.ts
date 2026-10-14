import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandMarkComponent } from '../brand-mark/brand-mark.component';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../lang-toggle/lang-toggle.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SpeciesNamePipe } from '../../pipes/species-name.pipe';
import { UserService } from '../../../core/services/user.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AdminAccessService } from '../../../core/services/admin-access.service';
import { environment } from '../../../../environments/environment';

interface NavItem {
  path: string;
  labelKey: string;
  protected: boolean;
  adminOnly: boolean;
}

/**
 * Cabecera de la app, común a todas las pantallas. Vive en el ámbito de tokens
 * `.chrome` (el eje en tinta del sonograma); sin sesión muestra el botón de entrar.
 */
@Component({
  selector: 'app-nav-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandMarkComponent, OfflineBannerComponent, ThemeToggleComponent, LangToggleComponent, TranslatePipe, SpeciesNamePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  // El host es el contexto sticky: debe quedar sobre las secciones de la página
  // (relative z-10 sobre el fondo) o estas pintan encima de los menús.
  host: {
    class: 'chrome sticky top-0 z-40 block w-full border-b',
    '(document:keydown.escape)': 'closeMenus()',
  },
  templateUrl: './nav-header.component.html',
  styles: `
    /* Nombre propio en las transiciones de ruta: la cabecera no se funde al cambiar de pantalla. */
    :host {
      view-transition-name: app-header;
    }
    .notifications-panel {
      max-width: calc(100vw - var(--space-gutter) * 2);
    }
    .header-scale {
      position: relative;
      height: calc(var(--space-unit) * 1.5);
      background: repeating-linear-gradient(
        to right,
        var(--color-on-chrome-variant) 0 var(--stroke-hairline),
        transparent var(--stroke-hairline) calc(var(--space-unit) * 4)
      );
    }
    .header-scale__reading {
      position: absolute;
      inset: 0;
      background: var(--color-sulfur);
      transform-origin: left;
      transform: scaleX(0);
      animation: header-reading linear both;
      animation-timeline: scroll(root block);
    }
    @keyframes header-reading {
      to {
        transform: scaleX(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .header-scale__reading {
        animation: none;
      }
    }
  `,
})
export class NavHeaderComponent {
  readonly user = inject(UserService);
  readonly notifications = inject(NotificationsService);
  readonly adminAccess = inject(AdminAccessService);

  readonly notificationsOpen = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly avatarFailed = signal(false);

  private readonly allNavItems: NavItem[] = [
    { path: '/dashboard', labelKey: 'nav.dashboard', protected: true, adminOnly: false },
    { path: '/record', labelKey: 'nav.record', protected: true, adminOnly: false },
    // Oculto a propósito: ver environment.photoIdentificationEnabled.
    ...(environment.photoIdentificationEnabled ? [{ path: '/photo-id', labelKey: 'nav.photoId', protected: true, adminOnly: false }] : []),
    { path: '/history', labelKey: 'nav.history', protected: true, adminOnly: false },
    { path: '/map', labelKey: 'nav.map', protected: false, adminOnly: false },
    { path: '/profile', labelKey: 'nav.profile', protected: true, adminOnly: false },
    { path: '/admin', labelKey: 'nav.admin', protected: true, adminOnly: true },
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

  closeMenus(): void {
    this.notificationsOpen.set(false);
    this.mobileMenuOpen.set(false);
  }
}
