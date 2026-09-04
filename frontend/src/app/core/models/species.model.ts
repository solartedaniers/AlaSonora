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
}

export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR';

export const IUCN_LABELS: Record<IucnStatus, string> = {
  LC: 'iucn.lc',
  NT: 'iucn.nt',
  VU: 'iucn.vu',
  EN: 'iucn.en',
  CR: 'iucn.cr',
};
