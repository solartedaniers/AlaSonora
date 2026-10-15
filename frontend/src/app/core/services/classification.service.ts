import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DetectionCandidate, GeoLocation, Species } from '../models';
import { SupabaseClientService } from './supabase-client.service';
import { UserService } from './user.service';

const RECORDINGS_BUCKET = 'recordings';
// Suficiente para que el backend descargue el audio durante la clasificación
// sin dejar la URL firmada utilizable indefinidamente (bucket privado).
const SIGNED_URL_TTL_SECONDS = 300;
// Mismo endpoint y cabeceras que usa supabase-js para subir; lo llamo directo porque el SDK no avisa el progreso.
const STORAGE_OBJECT_URL = `${environment.supabaseUrl}/storage/v1/object`;
const RECORDING_CONTENT_TYPE = 'audio/wav';

export interface ClassificationResult {
  species: Species;
  confidence: number;
  alternatives: DetectionCandidate[];
  disclaimer: string;
}

/** Resultado de subir una grabación: su ruta permanente y una URL de vida corta para clasificarla enseguida. */
export interface UploadedRecording {
  storagePath: string;
  signedUrl: string;
}

interface ClassifyDetectionPayload {
  audioUrl: string;
  recordedAt: string;
  location?: GeoLocation;
}

/** Subo la grabación al Storage privado de Supabase y pido al backend su clasificación con BirdNET. */
@Injectable({ providedIn: 'root' })
export class ClassificationService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly user = inject(UserService);

  /**
   * Subo el WAV al bucket privado `recordings`. Solo la ruta se guarda a largo
   * plazo (`Detection.audioStoragePath` en el backend); la URL firmada sirve para
   * classify() y para reproducir antes de guardar, nada más: vence y nunca se guarda.
   */
  async uploadRecording(userId: string, blob: Blob, onProgress?: (fraction: number) => void): Promise<UploadedRecording> {
    const storagePath = `${userId}/${Date.now()}.wav`;
    const token = await this.user.getAccessToken();
    // withXhr() en app.config: HttpClient entrega los eventos reales de progreso de la subida.
    await lastValueFrom(
      this.http
        .post(`${STORAGE_OBJECT_URL}/${RECORDINGS_BUCKET}/${storagePath}`, blob, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: environment.supabasePublishableKey,
            'Content-Type': RECORDING_CONTENT_TYPE,
            'x-upsert': 'false',
          },
          reportProgress: true,
          observe: 'events',
        })
        .pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) onProgress?.(event.loaded / event.total);
          })
        )
    );
    return { storagePath, signedUrl: await this.signRecording(storagePath) };
  }

  /** URL de vida corta para que el backend descargue la grabación (también al reintentar sin volver a subirla). */
  async signRecording(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data) throw error ?? new Error('Could not sign recording URL.');
    return data.signedUrl;
  }

  /** Paso `location` solo si es un GPS real: acota los candidatos de BirdNET a la región; sin ella uso el catálogo global. */
  async classify(audioUrl: string, recordedAt: string, location?: GeoLocation): Promise<ClassificationResult> {
    const payload: ClassifyDetectionPayload = { audioUrl, recordedAt, location };
    return firstValueFrom(
      this.http.post<ClassificationResult>(`${environment.apiBaseUrl}/detections/classify`, payload)
    );
  }
}
