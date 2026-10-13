import { Injectable, signal } from '@angular/core';
import { GeoLocation, Species } from '../models';

/** Id de ruta para un resultado aún sin guardar, antes de que el usuario confirme y el backend le dé un id real. */
export const DRAFT_DETECTION_ID = 'draft';

export interface DetectionDraft {
  species: Species;
  /** Ruta en el bucket privado `recordings`; esto, y no `audioUrl`, es lo que se guarda. */
  audioStoragePath?: string;
  recordedAt: string;
  audioUrl?: string;
  // Siempre undefined: un draft aún no tiene id de backend, así que no puede
  // tener foto de observador propia todavía (ver ResultComponent.isDraft).
  observerPhotoUrl?: string;
  durationSeconds: number;
  confidence: number;
  peakFrequencyHz: number;
  alternatives: { species: Species; confidence: number }[];
  location: GeoLocation;
  /** Aviso científico del clasificador: la IA da una referencia probabilística, no la verdad. */
  disclaimer?: string;
}

/**
 * Paso la detección recién clasificada (aún sin guardar) de /record a /result,
 * porque todavía no tiene un id del backend con el cual enrutar.
 */
@Injectable({ providedIn: 'root' })
export class DetectionDraftService {
  readonly draft = signal<DetectionDraft | null>(null);

  set(draft: DetectionDraft): void {
    this.draft.set(draft);
  }

  clear(): void {
    this.draft.set(null);
  }
}
