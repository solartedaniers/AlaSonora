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

/** Envío la foto directo al backend para clasificarla; a diferencia del audio, nunca va a Storage: pasa al motor de IA y se descarta. */
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
