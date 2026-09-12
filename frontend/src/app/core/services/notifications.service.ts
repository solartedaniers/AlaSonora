import { Injectable, inject, signal } from '@angular/core';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { Detection } from '../models';
import { DetectionsService } from './detections.service';
import { SupabaseClientService } from './supabase-client.service';

const MAX_NOTIFICATIONS = 20;

interface DetectionRow {
  id: number | string;
}

/**
 * Escucha nuevas detecciones PUBLIC en tiempo real vía Supabase Realtime
 * (requiere que `detections` esté en la publicación `supabase_realtime` y
 * tenga una policy de SELECT para visibility = 'PUBLIC'). El evento solo
 * trae la fila cruda de Postgres, así que reusamos DetectionsService.getAll()
 * para obtener el Detection completo (con especie anidada) en vez de
 * duplicar ese mapeo aquí.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly detectionsService = inject(DetectionsService);

  readonly notifications = signal<Detection[]>([]);
  readonly unseenCount = signal(0);

  constructor() {
    this.supabase.client
      .channel('public-detections')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'detections', filter: 'visibility=eq.PUBLIC' },
        (payload: RealtimePostgresInsertPayload<DetectionRow>) => this.onInsert(payload.new)
      )
      .subscribe();
  }

  markSeen(): void {
    this.unseenCount.set(0);
  }

  private async onInsert(row: DetectionRow): Promise<void> {
    const all = await this.detectionsService.getAll();
    const detection = all.find((d) => d.id === String(row.id));
    if (!detection) return; // aún no visible por réplica/RLS lag, se ignora

    this.notifications.update((list) => [detection, ...list].slice(0, MAX_NOTIFICATIONS));
    this.unseenCount.update((count) => count + 1);
  }
}
