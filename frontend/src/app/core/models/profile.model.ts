import { ObserverRole } from './user.model';

/** Backend-persisted profile (Postgres `profiles` table), distinct from Supabase Auth's user_metadata. */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: ObserverRole;
  institution?: string;
  orcidId?: string;
  stationName?: string;
}
