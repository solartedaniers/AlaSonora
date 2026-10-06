export const environment = {
  production: false,
  supabaseUrl: 'https://pfwvhdtygwvrbdvmbywk.supabase.co',
  supabasePublishableKey: 'sb_publishable_P3y3pPV_uvjd4iZuR2izEw_v8xryM97',
  apiBaseUrl: 'http://localhost:8083/api',
  // Photo identification is hidden intentionally — planned as a future
  // enhancement, not part of the current scope. Backend support
  // (PHOTO_CLASSIFICATION_ENABLED flag) stays in place so this can be
  // re-enabled without rework: flip this to true.
  photoIdentificationEnabled: false,
};