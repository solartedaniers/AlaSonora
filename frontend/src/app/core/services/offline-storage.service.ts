import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GeoLocation } from '../models';

const DB_NAME = 'alasonora-offline';
const STORE_NAME = 'pending-recordings';
const DB_VERSION = 1;
const NO_INDEXED_DB = 'IndexedDB is only available in the browser';

export interface PendingRecording {
  id: string;
  recordedAt: string;
  audioBlob: Blob;
  durationSeconds: number;
  peakFrequencyHz: number;
  /** Solo un GPS real, nunca la ubicación de respaldo: la misma regla que al clasificar en línea. */
  gpsLocation?: GeoLocation;
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
  // IndexedDB solo existe en el navegador: en SSR/prerender este servicio no la toca.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    // Cuento al arrancar: antes empezaba en 0 y las grabaciones de una sesión anterior
    // no aparecían en el aviso hasta el siguiente enqueue()/remove().
    if (this.isBrowser) void this.refreshCount();
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.isBrowser) return Promise.reject(new Error(NO_INDEXED_DB));
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
