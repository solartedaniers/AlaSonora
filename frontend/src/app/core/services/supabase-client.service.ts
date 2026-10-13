import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Clave de localStorage con la sesión de Supabase. Es la misma que el SDK deriva
 * (`sb-<project-ref>-auth-token`), así las sesiones existentes siguen vivas; la
 * escribo para que UserService lea la sesión sin conexión sin pasar por
 * getSession(), que intenta refrescar un token vencido.
 */
export const SUPABASE_SESSION_STORAGE_KEY = `sb-${new URL(environment.supabaseUrl).hostname.split('.')[0]}-auth-token`;

/**
 * Único cliente de Supabase de la app: Auth, Storage (avatares) y Realtime
 * (avisos de detecciones públicas) comparten conexión y sesión en vez de crear
 * cada uno su propio cliente.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  // En el servidor (SSR) no hay sesión de usuario que persistir ni refrescar:
  // la sesión vive en el localStorage del navegador. En el navegador estas
  // opciones quedan en true, igual que los valores por defecto del SDK.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        persistSession: this.isBrowser,
        autoRefreshToken: this.isBrowser,
        detectSessionInUrl: this.isBrowser,
        storageKey: SUPABASE_SESSION_STORAGE_KEY,
      },
    }
  );
}
