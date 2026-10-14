export const environment = {
  production: true,
  supabaseUrl: 'https://pfwvhdtygwvrbdvmbywk.supabase.co',
  supabasePublishableKey: 'sb_publishable_P3y3pPV_uvjd4iZuR2izEw_v8xryM97',
  apiBaseUrl: 'https://alasonora-backend.onrender.com/api',
  // Oculto a propósito la identificación por foto: es una mejora futura, fuera del
  // alcance actual. El backend la conserva (PHOTO_CLASSIFICATION_ENABLED), así que
  // basta poner esto en true para reactivarla.
  photoIdentificationEnabled: false,
  // Motor de IA dormido (Render gratis): cada cuánto pregunto si despertó, cuánto espero como
  // máximo y por cuánto tiempo confío en un "listo" antes de volver a calentarlo.
  aiEngine: {
    statusPollMs: 3000,
    wakeTimeoutMs: 90000,
    readyFreshMs: 600000,
  },
  // Cuenta de ejemplo que pidió el profesor: solo se muestra como placeholder en el login.
  demoAccount: {
    email: 'omairalimas05@gmail.com',
    password: 'Omaira25*',
  },
};
