import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * ISR (Incremental Static Regeneration) para las rutas SSR públicas.
 *
 * Angular no trae ISR nativo, así que se implementa como caché
 * stale-while-revalidate: la primera visita renderiza con SSR y guarda el
 * HTML; las siguientes lo reciben al instante desde memoria, y si la copia
 * tiene más de ISR_REVALIDATE_MS se regenera en segundo plano (el usuario
 * que dispara la regeneración igual recibe la copia vieja, sin esperar).
 * Solo se cachean rutas públicas sin datos por usuario: el servidor nunca
 * conoce la sesión (vive en el localStorage del navegador).
 *
 * ponytail: caché en memoria por proceso (se pierde al reiniciar y no se
 * comparte entre instancias); si se despliega con varias instancias, moverla
 * a Redis o delegarla a un CDN con el Cache-Control que ya se envía abajo.
 */
const ISR_ROUTES = new Set(['/map']);
const ISR_REVALIDATE_MS = 60_000;
// Pasado este tiempo la copia ya no se sirve "vieja": se renderiza de nuevo y
// se espera (evita que el primer visitante tras horas sin tráfico reciba un
// HTML de hace horas). Coincide con stale-while-revalidate=300 de abajo.
const ISR_MAX_STALE_MS = 300_000;
const ISR_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

interface IsrEntry {
  html: string;
  renderedAt: number;
}

const isrCache = new Map<string, IsrEntry>();
// Evita que varias visitas simultáneas regeneren la misma página a la vez.
const isrInFlight = new Map<string, Promise<string | null>>();

function regenerate(req: express.Request): Promise<string | null> {
  const key = req.path;
  const pending = isrInFlight.get(key);
  if (pending) return pending;

  const render = angularApp
    .handle(req)
    .then(async (response) => {
      // Errores (4xx/5xx) no se cachean: se deja que el handler normal responda.
      if (!response || response.status !== 200) return null;
      const html = await response.text();
      isrCache.set(key, { html, renderedAt: Date.now() });
      return html;
    })
    .finally(() => isrInFlight.delete(key));

  isrInFlight.set(key, render);
  return render;
}

app.get(/.*/, (req, res, next) => {
  if (!ISR_ROUTES.has(req.path)) return next();

  const cached = isrCache.get(req.path);
  const age = cached ? Date.now() - cached.renderedAt : Infinity;
  if (cached && age <= ISR_MAX_STALE_MS) {
    res.setHeader('Cache-Control', ISR_CACHE_CONTROL);
    res.setHeader('X-ISR-Cache', 'HIT');
    res.type('html').send(cached.html);
    if (age > ISR_REVALIDATE_MS) {
      regenerate(req).catch((error) => console.error('ISR: falló la regeneración de', req.path, error));
    }
    return;
  }

  regenerate(req)
    .then((html) => {
      if (html === null) return next();
      res.setHeader('Cache-Control', ISR_CACHE_CONTROL);
      res.setHeader('X-ISR-Cache', 'MISS');
      res.type('html').send(html);
    })
    .catch(next);
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// El resto de rutas: SSG sirve el HTML prerenderizado y CSR el index.csr.html,
// según el renderMode de app.routes.server.ts.
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Lo usa el Angular CLI en `ng serve` y en el prerender de `ng build`.
export const reqHandler = createNodeRequestHandler(app);
