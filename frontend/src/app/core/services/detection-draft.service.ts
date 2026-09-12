import { Injectable, signal } from '@angular/core';
import { GeoLocation, Species } from '../models';

/** Route id used for a not-yet-saved classification result, before the user confirms and it gets a real backend id. */
export const DRAFT_DETECTION_ID = 'draft';

export interface DetectionDraft {
  species: Species;
  recordedAt: string;
  audioUrl?: string;
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
