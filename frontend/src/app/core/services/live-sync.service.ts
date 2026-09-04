import { Injectable, NgZone, signal } from '@angular/core';
import {
  SharedWorkerDetectionBroadcast,
  SharedWorkerOutboundMessage,
} from '../../workers/messages';

/**
 * Envuelve el Shared Worker (`sync.worker.ts`) para que el resto de la app
 * lo consuma como un servicio normal de Angular, sin conocer los detalles
 * de `MessagePort`. Responsabilidad única: coordinar el estado de
 * "detecciones en vivo" y número de pestañas activas entre varias pestañas
 * del mismo navegador (ej. dashboard + mapa público abiertos a la vez).
 */
@Injectable({ providedIn: 'root' })
export class LiveSyncService {
  readonly activeTabCount = signal(1);
  readonly lastBroadcast = signal<SharedWorkerDetectionBroadcast | null>(null);

  private port?: MessagePort;
  private readonly tabId = crypto.randomUUID();

  constructor(private readonly zone: NgZone) {
    if (typeof SharedWorker === 'undefined') return; // no soportado (ej. algunos navegadores móviles)

    this.zone.runOutsideAngular(() => {
      const worker = new SharedWorker(new URL('../../workers/sync.worker', import.meta.url), {
        type: 'module',
      });
      this.port = worker.port;
      this.port.onmessage = ({ data }: MessageEvent<SharedWorkerOutboundMessage>) =>
        this.zone.run(() => this.onMessage(data));
      this.port.start();
      this.port.postMessage({ type: 'hello', tabId: this.tabId });
    });
  }

  broadcastDetection(payload: Omit<SharedWorkerDetectionBroadcast, 'type' | 'originTabId'>): void {
    this.port?.postMessage({
      type: 'detection-broadcast',
      originTabId: this.tabId,
      ...payload,
    } satisfies SharedWorkerDetectionBroadcast);
  }

  private onMessage(data: SharedWorkerOutboundMessage): void {
    if (data.type === 'tab-count') this.activeTabCount.set(data.count);
    if (data.type === 'detection-broadcast') this.lastBroadcast.set(data);
  }
}
