import { Species } from './species.model';

export type SyncStatus = 'synced' | 'pending-sync';

// Backend's Visibility enum is uppercase; kept as-is here (same convention as
// Species.iucnStatus) instead of adding a casing-mapping layer for one field.
export type Visibility = 'PRIVATE' | 'PUBLIC';

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
  visibility: Visibility;
  syncStatus: SyncStatus;
  /** Scientific disclaimer from the classifier (AI output is a probabilistic reference, not ground truth); only set right after classification, not persisted by the backend. */
  disclaimer?: string;
}

/** Payload for POST /api/detections; mirrors the backend's CreateDetectionRequest. */
export interface CreateDetectionRequest {
  speciesId: string;
  recordedAt: string;
  audioUrl?: string;
  durationSeconds: number;
  confidence: number;
  peakFrequencyHz: number;
  alternatives?: { speciesId: string; confidence: number }[];
  location: GeoLocation;
  observerName?: string;
  fieldNotes?: string;
  visibility: Visibility;
}
