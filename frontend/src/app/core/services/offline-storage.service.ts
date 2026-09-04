import { Injectable, signal } from '@angular/core';

const DB_NAME = 'alasonora-offline';
const STORE_NAME = 'pending-recordings';
const DB_VERSION = 1;

export interface PendingRecording {
  id: string;
  createdAt: string;
  audioBlob: Blob;
  latitude: number;
  longitude: number;
}

/**
 * Encapsula IndexedDB detrás de una API basada en Promesas para que el
 * resto de la app no dependa del API de bajo nivel de IndexedDB (SRP).
 * Se usa junto al Service Worker: al grabar sin conexión, el audio se
 * guarda aquí; al recuperar conectividad, el Service Worker (o esta
 * clase, si la app está en primer plano) sincroniza lo pendiente.
 */
@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  readonly pendingCount = signal(0);
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async enqueue(recording: PendingRecording): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(recording);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await this.refreshCount();
  }

  async listPending(): Promise<PendingRecording[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as PendingRecording[]);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: string): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await this.refreshCount();
  }

  private async refreshCount(): Promise<void> {
    const pending = await this.listPending();
    this.pendingCount.set(pending.length);
  }
}
