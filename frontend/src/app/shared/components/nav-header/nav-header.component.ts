import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandMarkComponent } from '../brand-mark/brand-mark.component';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../lang-toggle/lang-toggle.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { UserService } from '../../../core/services/user.service';
import { AppNotification, NotificationsService } from '../../../core/services/notifications.service';
import { I18nService } from '../../../core/services/i18n.service';
import { speciesDisplayName } from '../../../core/models';
import { AdminAccessService } from '../../../core/services/admin-access.service';
import { environment } from '../../../../environments/environment';

// Más avisos que esto se muestran como "9+": el punto conserva su tamaño.
const BADGE_MAX = 9;
// Sin lugar conocido cerca, la zona se da en coordenadas con esta precisión (~1 km).
const COORDINATE_DECIMALS = 2;

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
  imports: [RouterLink, RouterLinkActive, DatePipe, BrandMarkComponent, OfflineBannerComponent, ThemeToggleComponent, LangToggleComponent, TranslatePipe],
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
      position: absolute;
      inset-inline-end: 0;
      z-index: 50;
      width: calc(var(--space-unit) * 88);
      max-width: calc(100vw - var(--space-gutter) * 2);
      max-height: calc(var(--space-unit) * 112);
      margin-top: calc(var(--space-unit) * 2);
      overflow-y: auto;
      border-radius: var(--radius-xl);
      background: var(--color-surface-container);
      color: var(--color-on-surface);
      box-shadow: var(--shadow-xl);
    }
    /* Punto de alerta: rojo de grabación, con el número mientras quepa. */
    .bell-badge {
      position: absolute;
      inset-block-start: calc(var(--space-unit) * 1);
      inset-inline-end: calc(var(--space-unit) * 1);
      min-width: calc(var(--space-unit) * 5);
      height: calc(var(--space-unit) * 5);
      padding-inline: calc(var(--space-unit) * 1);
      display: grid;
      place-items: center;
      border-radius: var(--radius-full);
      border: var(--stroke-hairline) solid var(--color-chrome);
      background: var(--color-record);
      color: var(--color-on-record);
      font-family: var(--font-data);
      font-size: var(--text-xs);
      font-weight: 700;
      line-height: 1;
    }
    .notification {
      display: flex;
      align-items: stretch;
      border-block-end: var(--stroke-hairline) solid var(--color-outline-variant);
    }
    .notification:last-child {
      border-block-end: 0;
    }
    /* Lo que llegó desde la última vez: filete azufre mientras el panel sigue abierto. */
    .notification--unread {
      background: var(--color-surface-container-high);
      box-shadow: inset calc(var(--space-unit) * 1) 0 0 var(--color-sulfur);
    }
    .notification__body {
      flex: 1;
      min-width: 0;
      padding: calc(var(--space-unit) * 3) calc(var(--space-unit) * 4);
    }
    .notification__body:hover,
    .notification__map:hover {
      background: var(--color-surface-container-highest);
    }
    .notification__map {
      display: grid;
      place-items: center;
      width: var(--touch-target);
      color: var(--color-primary);
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
  private readonly i18n = inject(I18nService);
  readonly adminAccess = inject(AdminAccessService);

  readonly notificationsOpen = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly avatarFailed = signal(false);
  private readonly timeAgo = new TimeAgoPipe();

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

  /** Con avisos sin leer, el lector de pantalla oye cuántos. */
  readonly bellLabel = computed(() => {
    const count = this.notifications.unreadCount();
    return count > 0 ? this.i18n.translate('notifications.bellUnread', { count }) : this.i18n.translate('notifications.title');
  });
  readonly badgeText = computed(() => {
    const count = this.notifications.unreadCount();
    return count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
  });

  toggleNotifications(): void {
    if (this.notificationsOpen()) {
      this.closeNotifications();
      return;
    }
    this.notificationsOpen.set(true);
    void this.notifications.markAllRead();
  }

  closeMenus(): void {
    this.closeNotifications();
    this.mobileMenuOpen.set(false);
  }

  /** "omairalimas05 detectó Turpial dorsidorado cerca de Pasto, Nariño · hace 5 min", en el idioma activo. */
  describe(item: AppNotification): string {
    const where = item.area
      ? this.i18n.translate('notifications.near', { area: item.area })
      : this.i18n.translate('notifications.at', {
          latitude: item.location.latitude.toFixed(COORDINATE_DECIMALS),
          longitude: item.location.longitude.toFixed(COORDINATE_DECIMALS),
        });
    return this.i18n.translate('notifications.item', {
      user: item.observerName,
      species: speciesDisplayName(item.species, this.i18n.lang()),
      where,
      ago: this.timeAgo.transform(item.createdAt),
    });
  }

  private closeNotifications(): void {
    if (this.notificationsOpen()) this.notifications.clearHighlights();
    this.notificationsOpen.set(false);
  }
}
