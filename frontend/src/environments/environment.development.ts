export const environment = {
  production: false,
  supabaseUrl: 'https://pfwvhdtygwvrbdvmbywk.supabase.co',
  supabasePublishableKey: 'sb_publishable_P3y3pPV_uvjd4iZuR2izEw_v8xryM97',
  apiBaseUrl: 'http://localhost:8083/api',
  // Oculto a propósito la identificación por foto: es una mejora futura, fuera del
  // alcance actual. El backend la conserva (PHOTO_CLASSIFICATION_ENABLED), así que
  // basta poner esto en true para reactivarla.
  photoIdentificationEnabled: false,
  // Cuenta de ejemplo que pidió el profesor: solo se muestra como placeholder en el login.
  demoAccount: {
    email: 'omairalimas05@gmail.com',
    password: 'Omaira25*',
  },
};
