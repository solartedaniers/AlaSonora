import { ObserverRole } from './user.model';

/** Rol de acceso, independiente de `role` (el perfil científico del observador). */
export type SystemRole = 'user' | 'admin';

/** Perfil guardado en el backend (tabla `profiles` de Postgres), distinto de user_metadata de Supabase Auth. */
export interface Profile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  role: ObserverRole;
  institution?: string;
  orcidId?: string;
  stationName?: string;
  systemRole: SystemRole;
  suspended: boolean;
}
