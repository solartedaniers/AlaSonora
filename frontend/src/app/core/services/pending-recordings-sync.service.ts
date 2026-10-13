import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { GeoLocation } from '../models';
import { ClassificationService } from './classification.service';
import { DetectionsService } from './detections.service';
import { OfflineStorageService, PendingRecording } from './offline-storage.service';
import { UserService } from './user.service';

/** Debe coincidir con PENDING_RECORDINGS_SYNC_TAG en public/sw.js. */
export const PENDING_RECORDINGS_SYNC_TAG = 'alasonora-pending-recordings';

// Cerros Orientales de Bogotá como ubicación de respaldo si se niega o falla la
// geolocalización: toda detección necesita un punto en el mapa.
export const FALLBACK_LOCATION: GeoLocation = { latitude: 4.6097, longitude: -74.0817 };

/**
 * Modo campo: las grabaciones hechas sin señal quedan en IndexedDB
 * (OfflineStorageService) y las envío solas al volver la conexión.
 * Cualquiera de estos disparadores vacía la cola:
 *  - Background Sync: el service worker (public/sw.js) lanza `sync` al volver
 *    la conexión y avisa a las pestañas abiertas (solo Chromium).
 *  - El evento `online` de window (Firefox/Safari no tienen Background Sync).
 *  - El arranque de la app, por lo que quedó de una sesión anterior.
 */
@Injectable({ providedIn: 'root' })
export class PendingRecordingsSyncService {
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly classificationService = inject(ClassificationService);
  private readonly detectionsService = inject(DetectionsService);
  private readonly userService = inject(UserService);

  /** Solo en el navegador; se llama una vez al arrancar. */
  start(): void {
    window.addEventListener('online', () => void this.syncNow());
    navigator.serviceWorker?.addEventListener('message', async ({ data, ports }) => {
      if (data?.type !== PENDING_RECORDINGS_SYNC_TAG) return;
      await this.syncNow();
      // Le digo al SW si la sincronización terminó de verdad; si no, falla el
      // evento `sync` y el navegador lo reintenta.
      ports[0]?.postMessage({ remaining: (await this.offlineStorage.listPending()).length });
    });
    void this.syncNow();
  }

  async enqueue(recording: Omit<PendingRecording, 'id'>): Promise<void> {
    await this.offlineStorage.enqueue({ id: crypto.randomUUID(), ...recording });
    const registration = await navigator.serviceWorker?.getRegistration();
    // SyncManager aún no está en la lib DOM de TypeScript; fuera de Chromium no
    // existe y el listener `online` de arriba cubre el mismo caso.
    const sync = (registration as { sync?: { register(tag: string): Promise<void> } } | undefined)?.sync;
    await sync?.register(PENDING_RECORDINGS_SYNC_TAG).catch(() => undefined);
  }

  async syncNow(): Promise<void> {
    if (!navigator.onLine) return;
    // Web Lock: el mensaje del SW y el evento `online` llegan juntos a cada pestaña.
    // Vacío la cola de a una vez (también entre pestañas) y la leo solo con el lock,
    // así una grabación ya enviada nunca se sube ni se guarda dos veces.
    await navigator.locks.request(PENDING_RECORDINGS_SYNC_TAG, () => this.drain());
  }

  private async drain(): Promise<void> {
    const userId = await this.userService.getUserId();
    if (!userId) return;

    for (const recording of await this.offlineStorage.listPending()) {
      try {
        await this.send(userId, recording);
      } catch (error) {
        // 422 = el clasificador rechazó este audio para siempre (sin especie o mala
        // calidad): reintentar fallaría igual, así que sale de la cola. Cualquier
        // otro fallo (red, backend caído) se queda y se reintenta en el siguiente disparo.
        if (!(error instanceof HttpErrorResponse && error.status === 422)) return;
        console.warn('Queued recording rejected by the classifier, dropping it', error);
      }
      await this.offlineStorage.remove(recording.id);
    }
  }

  // Los mismos pasos del flujo en línea (RecordingComponent → ResultComponent) sin la
  // pantalla de revisión: nadie la revisa, así que la guardo PRIVATE y aparece en el historial.
  private async send(userId: string, recording: PendingRecording): Promise<void> {
    const { storagePath, signedUrl } = await this.classificationService.uploadRecording(userId, recording.audioBlob);
    const result = await this.classificationService.classify(signedUrl, recording.recordedAt, recording.gpsLocation);
    await this.detectionsService.create({
      speciesId: result.species.id,
      recordedAt: recording.recordedAt,
      audioStoragePath: storagePath,
      durationSeconds: recording.durationSeconds,
      confidence: result.confidence,
      peakFrequencyHz: recording.peakFrequencyHz,
      alternatives: result.alternatives.map((a) => ({ speciesId: a.species.id, confidence: a.confidence })),
      location: recording.gpsLocation ?? FALLBACK_LOCATION,
      observerName: this.userService.currentUser()?.fullName,
      visibility: 'PRIVATE',
    });
  }
}
