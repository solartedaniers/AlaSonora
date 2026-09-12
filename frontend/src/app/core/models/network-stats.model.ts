/** Estadísticas reales de la red bioacústica (solo agrega datos públicos), mostradas en el landing. */
export interface NetworkStats {
  totalSpecies: number;
  totalPublicDetections: number;
  distinctObservers: number;
  averageConfidencePct: number;
}
