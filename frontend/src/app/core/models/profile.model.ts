import { ObserverRole } from './user.model';

/** Access-control role, independent of `role` (the user's scientific/observer profile). */
export type SystemRole = 'user' | 'admin';

/** Backend-persisted profile (Postgres `profiles` table), distinct from Supabase Auth's user_metadata. */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: ObserverRole;
  institution?: string;
  orcidId?: string;
  stationName?: string;
  systemRole: SystemRole;
  suspended: boolean;
}
