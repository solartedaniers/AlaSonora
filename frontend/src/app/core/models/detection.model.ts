import { Species } from './species.model';

export type SyncStatus = 'synced' | 'pending-sync' | 'needs-review';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  placeName?: string;
}

/** Candidato alternativo devuelto por el clasificador junto al resultado principal. */
export interface DetectionCandidate {
  species: Species;
  confidence: number; // 0-100
}

/**
 * Un evento de detección: una grabación procesada por el modelo, con su
 * candidato principal, alternativas, y metadatos de campo (ubicación, fecha,
 * estado de sincronización offline).
 */
export interface Detection {
  id: string;
  recordedAt: string; // ISO 8601
  audioUrl?: string;
  durationSeconds: number;
  species: Species;
  confidence: number; // 0-100
  peakFrequencyHz: number;
  alternatives: DetectionCandidate[];
  location: GeoLocation;
  observerName: string;
  fieldNotes?: string;
  syncStatus: SyncStatus;
}
