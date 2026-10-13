import { Species } from './species.model';

export type SyncStatus = 'synced' | 'pending-sync';

// El enum Visibility del backend va en mayúsculas; lo dejo igual (como Species.iucnStatus)
// en vez de crear una capa de conversión para un solo campo.
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
  /** Foto del propio observador para ESTA detección, firmada al pedirla como audioUrl; nunca la foto oficial de la especie. */
  observerPhotoUrl?: string;
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
  /** Aviso científico del clasificador (la IA da una referencia probabilística, no la verdad); solo existe justo después de clasificar, el backend no lo guarda. */
  disclaimer?: string;
}

/** Cuerpo de POST /api/detections; refleja CreateDetectionRequest del backend. */
export interface CreateDetectionRequest {
  speciesId: string;
  recordedAt: string;
  /** Ruta del objeto en el bucket privado `recordings`, nunca una URL firmada. */
  audioStoragePath?: string;
  durationSeconds: number;
  confidence: number;
  peakFrequencyHz: number;
  alternatives?: { speciesId: string; confidence: number }[];
  location: GeoLocation;
  observerName?: string;
  fieldNotes?: string;
  visibility: Visibility;
}
