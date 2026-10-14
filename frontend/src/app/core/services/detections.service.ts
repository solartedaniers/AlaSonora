import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateDetectionRequest, Detection } from '../models';
import { SupabaseClientService } from './supabase-client.service';
import { storageObjectName } from './storage-object-name';

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

  /**
   * `fresh` salta la caché de transferencia del SSR, que responde esta URL con la
   * foto tomada al renderizar hasta que la app se estabiliza; sin esto, una detección
   * guardada después de cargar la página nunca aparecería.
   */
  async getAll(fresh = false): Promise<Detection[]> {
    const params = new HttpParams().set('visibility', 'public');
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(this.baseUrl, { params, transferCache: !fresh })
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

  /** Todo mi historial, de la más reciente a la más antigua (una sola petición a /mine). */
  async getMineNewestFirst(): Promise<Detection[]> {
    const mine = await this.getMine();
    return [...mine].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
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
    // Nombre único sin upsert: con upsert Storage exige también SELECT y la política no lo tenía.
    const path = `${userId}/${storageObjectName(file, detectionId)}`;
    const { error } = await this.supabase.storage
      .from(OBSERVER_PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type });
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
