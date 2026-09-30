import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Hybrid Rendering: cada ruta elige su patrón de rendering.
 *
 * - Prerender (SSG): HTML generado una sola vez en `ng build`. Páginas
 *   públicas sin datos por usuario → TTFB casi instantáneo y buen SEO.
 * - Server (SSR): HTML armado en cada petición con datos frescos. /map es
 *   público y dinámico; server.ts le suma una caché ISR (stale-while-revalidate).
 * - Client (CSR): HTML vacío, todo se arma en el navegador. Rutas privadas:
 *   la sesión de Supabase vive en el localStorage del navegador, así que el
 *   servidor no sabe quién es el usuario (authGuard siempre redirigiría a
 *   /login); además usan micrófono, IndexedDB y Workers, y no necesitan SEO.
 *   /reset-password también: el token llega en el #hash, que nunca viaja al
 *   servidor.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'forgot-password', renderMode: RenderMode.Prerender },
  { path: 'map', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
