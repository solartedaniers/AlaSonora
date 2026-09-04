/// <reference lib="webworker" />

import {
  SharedWorkerInboundMessage,
  SharedWorkerOutboundMessage,
  SharedWorkerDetectionBroadcast,
} from './messages';

/**
 * Shared Worker: una única instancia compartida por todas las pestañas de
 * AlaSonora abiertas por el mismo usuario en el mismo navegador. Se usa
 * para:
 *  1. Sincronizar el "mapa de detecciones en vivo" entre pestañas (si el
 *     usuario tiene el dashboard y el mapa público abiertos a la vez, una
 *     nueva detección en una pestaña aparece de inmediato en la otra).
 *  2. Llevar la cuenta de cuántas pestañas de la app están activas.
 *
 * A diferencia del Web Worker dedicado, aquí SÍ hay múltiples puertos
 * (uno por pestaña conectada), así que reenviamos cada mensaje entrante
 * a todos los puertos conocidos excepto al que lo originó.
 */

declare const self: SharedWorkerGlobalScope;

const ports = new Set<MessagePort>();

self.addEventListener('connect', (event: MessageEvent) => {
  const port = (event as unknown as { ports: MessagePort[] }).ports[0];
  ports.add(port);

  port.addEventListener('message', ({ data }: MessageEvent<SharedWorkerInboundMessage>) => {
    if (data.type === 'hello') {
      broadcastTabCount();
      return;
    }

    if (data.type === 'detection-broadcast') {
      broadcastToOthers(port, data);
    }
  });

  port.addEventListener('close', () => {
    ports.delete(port);
    broadcastTabCount();
  });

  port.start();
  broadcastTabCount();
});

function broadcastToOthers(origin: MessagePort, message: SharedWorkerDetectionBroadcast): void {
  for (const port of ports) {
    if (port !== origin) port.postMessage(message satisfies SharedWorkerOutboundMessage);
  }
}

function broadcastTabCount(): void {
  const message: SharedWorkerOutboundMessage = { type: 'tab-count', count: ports.size };
  for (const port of ports) port.postMessage(message);
}
