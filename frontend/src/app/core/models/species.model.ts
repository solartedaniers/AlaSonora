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

/**
 * Traducción de los valores del campo `type` de Xeno-canto (species.typicalVocalizations),
 * texto semi-libre de un recolector de datos externo, no un enum cerrado.
 * Claves en minúscula, ya recortadas. Cubre los valores observados con
 * frecuencia real en pruebas contra la API (canto/reclamo y variantes
 * documentadas), no un vocabulario inventado. Cualquier valor fuera de este
 * diccionario se muestra tal cual vino de Xeno-canto (ver VocalizationTagPipe).
 */
export const XENO_CANTO_VOCALIZATION_LABELS: Record<string, string> = {
  song: 'vocalizationTag.song',
  singing: 'vocalizationTag.song',
  call: 'vocalizationTag.call',
  calls: 'vocalizationTag.call',
  'alarm call': 'vocalizationTag.alarmCall',
  'flight call': 'vocalizationTag.flightCall',
  'nocturnal flight call': 'vocalizationTag.nocturnalFlightCall',
  duet: 'vocalizationTag.duet',
  subsong: 'vocalizationTag.subsong',
  'begging call': 'vocalizationTag.beggingCall',
  'dawn song': 'vocalizationTag.dawnSong',
  purring: 'vocalizationTag.purring',
  drumming: 'vocalizationTag.drumming',
  // No vocal: sonido mecánico de alas, visto repetido en pruebas reales bajo
  // varias redacciones distintas del mismo fenómeno.
  wingbeats: 'vocalizationTag.wingSound',
  wings: 'vocalizationTag.wingSound',
  'wing beats': 'vocalizationTag.wingSound',
  'flapping of wings': 'vocalizationTag.wingSound',
  'mechanical sound - wings beating': 'vocalizationTag.wingSound',
};

/** Clave de traducción para un tag de Xeno-canto, o null si no está en el diccionario (el caller decide el fallback). */
export function xenoCantoVocalizationLabelKey(rawType: string): string | null {
  return XENO_CANTO_VOCALIZATION_LABELS[rawType.toLowerCase().trim()] ?? null;
}
