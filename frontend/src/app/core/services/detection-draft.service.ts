import { Injectable, signal } from '@angular/core';
import { GeoLocation, Species } from '../models';

/** Route id used for a not-yet-saved classification result, before the user confirms and it gets a real backend id. */
export const DRAFT_DETECTION_ID = 'draft';

export interface DetectionDraft {
  species: Species;
  /** Object key in the private `recordings` bucket; this, not `audioUrl`, is what gets persisted. */
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
  /** Scientific disclaimer returned by the classifier: AI output is a probabilistic reference, not ground truth. */
  disclaimer?: string;
}

/**
 * Hands off the just-classified (not yet persisted) detection from
 * /record to /result, since the real AI classifier lives in a future
 * async phase and doesn't yet return a backend-issued id to route by.
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
