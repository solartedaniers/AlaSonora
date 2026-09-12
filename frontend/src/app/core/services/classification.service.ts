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

interface ClassifyDetectionPayload {
  audioUrl: string;
  recordedAt: string;
  location: GeoLocation;
}

/** Uploads a recording to private Supabase Storage and requests its BirdNET classification from the backend. */
@Injectable({ providedIn: 'root' })
export class ClassificationService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;

  /** Uploads the WAV blob to the private `recordings` bucket and returns a time-limited signed URL. */
  async uploadRecording(userId: string, blob: Blob): Promise<string> {
    const path = `${userId}/${Date.now()}.wav`;
    const { error } = await this.supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(path, blob, { contentType: 'audio/wav' });
    if (error) throw error;

    const { data, error: signError } = await this.supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signError || !data) throw signError ?? new Error('Could not sign recording URL.');
    return data.signedUrl;
  }

  async classify(audioUrl: string, recordedAt: string, location: GeoLocation): Promise<ClassificationResult> {
    const payload: ClassifyDetectionPayload = { audioUrl, recordedAt, location };
    return firstValueFrom(
      this.http.post<ClassificationResult>(`${environment.apiBaseUrl}/detections/classify`, payload)
    );
  }
}
