// Registered instead of ngsw-worker.js (see app.config.ts): keeps Angular's
// generated service worker for app-shell caching (ngsw-config.json) and adds
// the Background Sync handler for recordings made offline.
importScripts('./ngsw-worker.js');

// Must match PENDING_RECORDINGS_SYNC_TAG in pending-recordings-sync.service.ts.
const PENDING_RECORDINGS_SYNC_TAG = 'alasonora-pending-recordings';

self.addEventListener('sync', (event) => {
  if (event.tag !== PENDING_RECORDINGS_SYNC_TAG) return;
  // El envío necesita la sesión de Supabase, que vive en el localStorage de
  // la página (inaccesible desde el SW): aquí se le pide a una pestaña
  // abierta que vacíe la cola de IndexedDB y se espera su respuesta. Si no
  // hay pestaña o la cola no quedó vacía, se rechaza para que el navegador
  // reintente el sync más tarde (la app además la vacía al volver a abrirse
  // y con el evento `online`).
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length === 0) throw new Error('No open AlaSonora tab to sync from');
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = ({ data }) =>
          data.remaining === 0 ? resolve() : reject(new Error(`${data.remaining} recordings still pending`));
        clients[0].postMessage({ type: PENDING_RECORDINGS_SYNC_TAG }, [channel.port2]);
      });
    })
  );
});
