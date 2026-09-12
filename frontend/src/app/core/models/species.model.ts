/**
 * Especie identificada por el modelo BirdNET (o candidata en el ranking de
 * alternativas). Mantenemos nombre común, nombre científico y metadatos
 * taxonómicos separados de la lógica de presentación.
 */
export interface Species {
  id: string;
  commonName: string;
  commonNameEn: string;
  scientificName: string;
  family: string;
  order: string;
  iucnStatus: IucnStatus;
  imageUrl?: string;
  vocalizationType: VocalizationType;
  behaviorNotes?: string;
}

export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'NE';

export const IUCN_LABELS: Record<IucnStatus, string> = {
  LC: 'iucn.lc',
  NT: 'iucn.nt',
  VU: 'iucn.vu',
  EN: 'iucn.en',
  CR: 'iucn.cr',
  NE: 'iucn.ne',
};

/** Predominant vocalization documented for the species' profile (bioacoustic enrichment); UNKNOWN for species auto-registered from an AI classification. */
export type VocalizationType = 'SONG' | 'CALL' | 'DRUMMING' | 'UNKNOWN';

export const VOCALIZATION_LABELS: Record<VocalizationType, string> = {
  SONG: 'vocalization.song',
  CALL: 'vocalization.call',
  DRUMMING: 'vocalization.drumming',
  UNKNOWN: 'vocalization.unknown',
};
