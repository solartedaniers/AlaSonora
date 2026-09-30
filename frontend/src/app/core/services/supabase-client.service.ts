import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Holds the one Supabase client instance for the whole app, so Auth here,
 * Storage uploads (profile avatars) and Realtime (public detection
 * notifications) all share the same connection/session instead of each
 * creating their own client.
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
      },
    }
  );
}
