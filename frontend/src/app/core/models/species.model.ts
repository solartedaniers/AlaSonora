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
  /** Reference only, sourced from Xeno-canto for the species overall — never an analysis of one specific recording. */
  typicalVocalizations: string[];
}

/**
 * Nombre común a mostrar según el idioma activo, con fallback en cadena
 * (idioma activo → el otro idioma → nombre científico) para que nunca se
 * muestre un campo vacío si el catálogo tiene datos incompletos.
 */
export function speciesDisplayName(species: Species, lang: 'es' | 'en'): string {
  const localized = lang === 'en' ? species.commonNameEn : species.commonName;
  const other = lang === 'en' ? species.commonName : species.commonNameEn;
  return localized || other || species.scientificName;
}

export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'DD' | 'NE' | 'EW' | 'EX';

export const IUCN_LABELS: Record<IucnStatus, string> = {
  LC: 'iucn.lc',
  NT: 'iucn.nt',
  VU: 'iucn.vu',
  EN: 'iucn.en',
  CR: 'iucn.cr',
  DD: 'iucn.dd',
  NE: 'iucn.ne',
  EW: 'iucn.ew',
  EX: 'iucn.ex',
};

/** Predominant vocalization documented for the species' profile (bioacoustic enrichment); UNKNOWN for species auto-registered from an AI classification. */
export type VocalizationType = 'SONG' | 'CALL' | 'DRUMMING' | 'UNKNOWN';

export const VOCALIZATION_LABELS: Record<VocalizationType, string> = {
  SONG: 'vocalization.song',
  CALL: 'vocalization.call',
  DRUMMING: 'vocalization.drumming',
  UNKNOWN: 'vocalization.unknown',
};
