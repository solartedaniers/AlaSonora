import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DetectionCandidate, GeoLocation, Species } from '../models';
import { SupabaseClientService } from './supabase-client.service';

const RECORDINGS_BUCKET = 'recordings';
// Suficiente para que el backend descargue el audio durante la clasificación
// sin dejar la URL firmada utilizable indefinidamente (bucket privado).
const SIGNED_URL_TTL_SECONDS = 300;

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

  /**
   * Subo el WAV al bucket privado `recordings`. Solo la ruta se guarda a largo
   * plazo (`Detection.audioStoragePath` en el backend); la URL firmada sirve para
   * classify() y para reproducir antes de guardar, nada más: vence y nunca se guarda.
   */
  async uploadRecording(userId: string, blob: Blob): Promise<UploadedRecording> {
    const storagePath = `${userId}/${Date.now()}.wav`;
    const { error } = await this.supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(storagePath, blob, { contentType: 'audio/wav' });
    if (error) throw error;

    const { data, error: signError } = await this.supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signError || !data) throw signError ?? new Error('Could not sign recording URL.');
    return { storagePath, signedUrl: data.signedUrl };
  }

  /** Paso `location` solo si es un GPS real: acota los candidatos de BirdNET a la región; sin ella uso el catálogo global. */
  async classify(audioUrl: string, recordedAt: string, location?: GeoLocation): Promise<ClassificationResult> {
    const payload: ClassifyDetectionPayload = { audioUrl, recordedAt, location };
    return firstValueFrom(
      this.http.post<ClassificationResult>(`${environment.apiBaseUrl}/detections/classify`, payload)
    );
  }
}
