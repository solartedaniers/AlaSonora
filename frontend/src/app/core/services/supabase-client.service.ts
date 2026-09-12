import { Injectable } from '@angular/core';
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
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey
  );
}
