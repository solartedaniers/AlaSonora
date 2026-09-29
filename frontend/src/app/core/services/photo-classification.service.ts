import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PhotoClassificationCandidate {
  label: string;
  confidence: number;
}

export interface PhotoClassificationResult {
  top: PhotoClassificationCandidate;
  alternatives: PhotoClassificationCandidate[];
}

/** Uploads a bird photo straight to the backend for classification; unlike recordings, the photo is never persisted to Storage — it's only forwarded to the AI engine and discarded. */
@Injectable({ providedIn: 'root' })
export class PhotoClassificationService {
  private readonly http = inject(HttpClient);

  async classify(file: File): Promise<PhotoClassificationResult> {
    const formData = new FormData();
    formData.append('photo', file);
    return firstValueFrom(
      this.http.post<PhotoClassificationResult>(`${environment.apiBaseUrl}/photo-classifications`, formData)
    );
  }
}
