import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { GeoLocation } from '../models';
import { ClassificationService } from './classification.service';
import { DetectionsService } from './detections.service';
import { OfflineStorageService, PendingRecording } from './offline-storage.service';
import { UserService } from './user.service';

/** Must match PENDING_RECORDINGS_SYNC_TAG in public/sw.js. */
export const PENDING_RECORDINGS_SYNC_TAG = 'alasonora-pending-recordings';

// Bogotá's Eastern Hills as a stand-in field location when geolocation is
// denied/unavailable: a detection always needs a map location.
export const FALLBACK_LOCATION: GeoLocation = { latitude: 4.6097, longitude: -74.0817 };

/**
 * Field mode: recordings made without signal are queued in IndexedDB
 * (OfflineStorageService) and sent automatically once connectivity returns.
 * Triggers, any of which drains the queue:
 *  - Background Sync: the service worker (public/sw.js) fires `sync` when the
 *    connection comes back and messages the open tabs (Chromium only).
 *  - The window `online` event (Firefox/Safari have no Background Sync).
 *  - App start, for anything left over from a previous session.
 */
@Injectable({ providedIn: 'root' })
export class PendingRecordingsSyncService {
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly classificationService = inject(ClassificationService);
  private readonly detectionsService = inject(DetectionsService);
  private readonly userService = inject(UserService);

  /** Browser only — call once at app start. */
  start(): void {
    window.addEventListener('online', () => void this.syncNow());
    navigator.serviceWorker?.addEventListener('message', async ({ data, ports }) => {
      if (data?.type !== PENDING_RECORDINGS_SYNC_TAG) return;
      await this.syncNow();
      // Tells the SW whether the sync really finished, so it can fail the
      // `sync` event and let the browser retry it otherwise.
      ports[0]?.postMessage({ remaining: (await this.offlineStorage.listPending()).length });
    });
    void this.syncNow();
  }

  async enqueue(recording: Omit<PendingRecording, 'id'>): Promise<void> {
    await this.offlineStorage.enqueue({ id: crypto.randomUUID(), ...recording });
    const registration = await navigator.serviceWorker?.getRegistration();
    // SyncManager is not in TypeScript's DOM lib yet; it's absent outside
    // Chromium, where the `online` listener above covers the same case.
    const sync = (registration as { sync?: { register(tag: string): Promise<void> } } | undefined)?.sync;
    await sync?.register(PENDING_RECORDINGS_SYNC_TAG).catch(() => undefined);
  }

  async syncNow(): Promise<void> {
    if (!navigator.onLine) return;
    // Web Lock: the SW message and the `online` event arrive together, in
    // every open tab — drains run one at a time (across tabs too), and each
    // reads the queue only once it holds the lock, so a recording the
    // previous drain already sent is never uploaded/saved twice.
    await navigator.locks.request(PENDING_RECORDINGS_SYNC_TAG, () => this.drain());
  }

  private async drain(): Promise<void> {
    const userId = await this.userService.getUserId();
    if (!userId) return;

    for (const recording of await this.offlineStorage.listPending()) {
      try {
        await this.send(userId, recording);
      } catch (error) {
        // 422 = the classifier rejected this audio for good (no species /
        // bad quality): retrying would only fail again, so it leaves the
        // queue. Anything else (network, backend down) stays queued and is
        // retried on the next trigger.
        if (!(error instanceof HttpErrorResponse && error.status === 422)) return;
        console.warn('Queued recording rejected by the classifier, dropping it', error);
      }
      await this.offlineStorage.remove(recording.id);
    }
  }

  // Same steps as the online flow (RecordingComponent → ResultComponent),
  // minus the review screen: there is no one to review it, so it is saved
  // with the default PRIVATE visibility and shows up in the user's history.
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
