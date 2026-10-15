import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GeoLocation, Species } from '../models';
import { LoggerService } from './logger.service';
import { SupabaseClientService } from './supabase-client.service';
import { UserService } from './user.service';

/** Aviso de la campana: otra persona guardó una detección pública (ver NotificationService en el backend). */
export interface AppNotification {
  detectionId: string;
  observerName: string;
  species: Species;
  location: GeoLocation;
  /** Lugar guardado o el conocido más cercano; null si no hay ninguno cerca. */
  area: string | null;
  createdAt: string;
  unread: boolean;
}

interface NotificationFeed {
  unreadCount: number;
  items: AppNotification[];
}

// Canal privado y evento que emite el trigger de la base (database/2026-10-16_notifications.sql).
const CHANNEL_TOPIC = 'public-detections';
const CREATED_EVENT = 'detection-created';

/**
 * Campana de avisos. El historial y el estado de leído viven en el backend (se conservan entre
 * dispositivos); Supabase Realtime solo avisa "hay algo nuevo" mientras la app está abierta y hay
 * sesión. No hay sondeo: si llega un aviso con la pestaña oculta, pido el detalle al volver a ella.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly user = inject(UserService);
  private readonly logger = inject(LoggerService);
  private readonly document = inject(DOCUMENT);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  readonly items = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);

  private userId: string | null = null;
  private channel?: RealtimeChannel;
  /** Llegó un aviso con la pestaña oculta: lo pido al volver, nunca en segundo plano. */
  private stale = false;

  constructor() {
    // En SSR esto abriría un WebSocket por cada petición al servidor: solo en el navegador.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    effect(() => {
      const userId = this.user.currentUser()?.id ?? null;
      untracked(() => this.follow(userId));
    });
    this.document.addEventListener('visibilitychange', () => {
      if (this.isVisible() && this.userId && this.stale) void this.refresh();
    });
  }

  async refresh(): Promise<void> {
    if (!this.userId) return;
    if (!this.isVisible()) {
      this.stale = true;
      return;
    }
    this.stale = false;
    try {
      this.apply(await firstValueFrom(this.http.get<NotificationFeed>(this.baseUrl)));
    } catch (error) {
      this.logger.warn('Notifications', 'could not load the bell', error);
    }
  }

  /**
   * Al abrir el panel: el punto desaparece y queda guardado como leído. Las marcas de "nuevo" se
   * mantienen mientras el panel sigue abierto, para que se vea qué llegó; se quitan al cerrarlo.
   */
  async markAllRead(): Promise<void> {
    if (this.unreadCount() === 0) return;
    this.unreadCount.set(0);
    try {
      await firstValueFrom(this.http.post<void>(`${this.baseUrl}/read`, null));
    } catch (error) {
      this.logger.warn('Notifications', 'could not mark the bell as read', error);
    }
  }

  /** Al cerrar el panel, lo ya visto deja de verse como nuevo. */
  clearHighlights(): void {
    this.items.update((list) => list.map((item) => (item.unread ? { ...item, unread: false } : item)));
  }

  private follow(userId: string | null): void {
    if (userId === this.userId) return;
    this.userId = userId;
    this.items.set([]);
    this.unreadCount.set(0);
    if (this.channel) void this.supabase.removeChannel(this.channel);
    this.channel = undefined;
    if (!userId) return;

    this.channel = this.supabase
      .channel(CHANNEL_TOPIC, { config: { private: true } })
      .on('broadcast', { event: CREATED_EVENT }, ({ payload }) => {
        // Mis propias detecciones no me avisan; el backend tampoco las devuelve.
        if ((payload as { ownerId?: string }).ownerId !== userId) void this.refresh();
      })
      .subscribe();
    void this.refresh();
  }

  private apply(feed: NotificationFeed): void {
    this.items.set(feed.items);
    this.unreadCount.set(feed.unreadCount);
  }

  private isVisible(): boolean {
    return this.document.visibilityState === 'visible';
  }
}
