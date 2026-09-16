import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateDetectionRequest, Detection } from '../models';
import { SupabaseClientService } from './supabase-client.service';

/** Detección tal como la devuelve el backend, sin el estado de sincronización offline. */
type DetectionApiResponse = Omit<Detection, 'syncStatus'>;

const OBSERVER_PHOTOS_BUCKET = 'observer-photos';

/**
 * Cuaderno de campo contra el backend real. `getAll()` es el feed público
 * (GET /api/detections?visibility=public, usado por el mapa); `getMine()`
 * es el historial del usuario autenticado (GET /api/detections/mine).
 */
@Injectable({ providedIn: 'root' })
export class DetectionsService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly baseUrl = `${environment.apiBaseUrl}/detections`;

  async getAll(): Promise<Detection[]> {
    const params = new HttpParams().set('visibility', 'public');
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(this.baseUrl, { params })
    );
    return detections.map((d) => this.withSyncStatus(d));
  }

  async create(request: CreateDetectionRequest): Promise<Detection> {
    const created = await firstValueFrom(
      this.http.post<DetectionApiResponse>(this.baseUrl, request)
    );
    return this.withSyncStatus(created);
  }

  async getMine(): Promise<Detection[]> {
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(`${this.baseUrl}/mine`)
    );
    return detections.map((d) => this.withSyncStatus(d));
  }

  // El backend firma una URL de audio nueva en cada solicitud; llamar al
  // endpoint dedicado (en vez de filtrar getMine()) es lo que hace que una
  // detección PRIVATE siga siendo reproducible sin importar cuánto tiempo
  // haya pasado desde que se subió.
  async getById(id: string): Promise<Detection | undefined> {
    try {
      const detection = await firstValueFrom(
        this.http.get<DetectionApiResponse>(`${this.baseUrl}/${id}`)
      );
      return this.withSyncStatus(detection);
    } catch {
      return undefined;
    }
  }

  async getRecent(limit = 5): Promise<Detection[]> {
    const mine = await this.getMine();
    return [...mine]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, limit);
  }

  /** Historial de cualquier usuario, solo para el panel de administración (GET /api/admin/users/{id}/detections). */
  async getForUser(userId: string): Promise<Detection[]> {
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(`${environment.apiBaseUrl}/admin/users/${userId}/detections`)
    );
    return detections.map((d) => this.withSyncStatus(d));
  }

  /**
   * Sube la foto propia del observador para una detección ya guardada al
   * bucket privado `observer-photos` (mismo patrón de carpeta por
   * auth.uid() que avatars/recordings) y persiste el path en el backend,
   * que la firma bajo demanda como el audio — nunca la foto de referencia
   * oficial de la especie.
   */
  async uploadObserverPhoto(detectionId: string, userId: string, file: File): Promise<Detection> {
    const path = `${userId}/${detectionId}-${Date.now()}-${file.name}`;
    const { error } = await this.supabase.storage
      .from(OBSERVER_PHOTOS_BUCKET)
      .upload(path, file, { upsert: true });
    if (error) throw error;

    const updated = await firstValueFrom(
      this.http.put<DetectionApiResponse>(`${this.baseUrl}/${detectionId}/observer-photo`, {
        observerPhotoStoragePath: path,
      })
    );
    return this.withSyncStatus(updated);
  }

  /** Borra cualquier detección (pública o privada), solo para el panel de administración. */
  async deleteAsAdmin(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/admin/detections/${id}`));
  }

  // Toda detección que viene del backend ya está persistida, así que su
  // estado de sincronización offline es siempre "synced".
  private withSyncStatus(detection: DetectionApiResponse): Detection {
    return { ...detection, syncStatus: 'synced' };
  }
}
