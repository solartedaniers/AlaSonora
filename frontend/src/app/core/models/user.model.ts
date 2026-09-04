export type ObserverRole = 'ornithologist' | 'ranger' | 'biologist' | 'hobbyist' | 'student';

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: ObserverRole;
  institution?: string;
  avatarUrl?: string;
  orcidId?: string;
  stationName?: string;
}

/** Estadísticas agregadas del cuaderno de campo de un usuario. */
export interface UserStats {
  totalRecordings: number;
  validatedRecordings: number;
  pendingSyncRecordings: number;
  distinctSpecies: number;
  averageConfidence: number;
  activeStreakDays: number;
}
