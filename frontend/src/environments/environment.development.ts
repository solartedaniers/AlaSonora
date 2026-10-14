export const environment = {
  production: false,
  supabaseUrl: 'https://pfwvhdtygwvrbdvmbywk.supabase.co',
  supabasePublishableKey: 'sb_publishable_P3y3pPV_uvjd4iZuR2izEw_v8xryM97',
  apiBaseUrl: 'http://localhost:8083/api',
  // Oculto a propósito la identificación por foto: es una mejora futura, fuera del
  // alcance actual. El backend la conserva (PHOTO_CLASSIFICATION_ENABLED), así que
  // basta poner esto en true para reactivarla.
  photoIdentificationEnabled: false,
  // Ilustración de la app cuando una especie no tiene foto o su foto no carga.
  speciesImageFallback: 'images/sketch.webp',
  // Motor de IA dormido (Render gratis): cada cuánto pregunto si despertó, cuánto espero como
  // máximo y por cuánto tiempo confío en un "listo" antes de volver a calentarlo. El arranque en
  // frío de Render (servicio + carga del modelo) puede pasar de un minuto: espero hasta 3.
  aiEngine: {
    statusPollMs: 3000,
    wakeTimeoutMs: 180000,
    readyFreshMs: 600000,
  },
  // Cuenta de ejemplo que pidió el profesor: solo se muestra como placeholder en el login.
  demoAccount: {
    email: 'omairalimas05@gmail.com',
    password: 'Omaira25*',
  },
};
