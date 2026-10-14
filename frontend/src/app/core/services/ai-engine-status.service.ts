import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AiEngineStatus = 'unknown' | 'waking' | 'ready' | 'unavailable';

interface AiStatusResponse {
  ready: boolean;
}

/**
 * Estado del motor de IA, que en Render se duerme por inactividad. Pregunto al backend
 * (GET /api/ai/status), nunca al motor directo. El sondeo usa setTimeout: cada consulta es
 * una tarea corta que solo actualiza el signal, sin bloquear el hilo principal ni el pintado.
 */
@Injectable({ providedIn: 'root' })
export class AiEngineStatusService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config = environment.aiEngine;

  readonly status = signal<AiEngineStatus>('unknown');
  private lastReadyAt = 0;
  /** Un solo sondeo a la vez, compartido por quien esté esperando. */
  private pending: Promise<boolean> | null = null;

  /** Despierta el motor en silencio; no hace nada si hace poco respondió que estaba listo. */
  warmUp(): void {
    if (this.isFresh()) return;
    void this.whenReady();
  }

  /** Se resuelve en true cuando el motor responde, o en false si se agota el tiempo máximo. */
  whenReady(): Promise<boolean> {
    if (!this.isBrowser) return Promise.resolve(false);
    if (this.isFresh()) return Promise.resolve(true);
    this.pending ??= this.poll().finally(() => (this.pending = null));
    return this.pending;
  }

  /** El backend dijo que el motor no respondió: lo vuelvo a dar por dormido. */
  markAsleep(): void {
    this.lastReadyAt = 0;
    this.status.set('waking');
  }

  private async poll(): Promise<boolean> {
    const deadline = Date.now() + this.config.wakeTimeoutMs;
    while (Date.now() < deadline) {
      if (await this.isReady()) {
        this.lastReadyAt = Date.now();
        this.status.set('ready');
        return true;
      }
      this.status.set('waking');
      await new Promise((resolve) => setTimeout(resolve, this.config.statusPollMs));
    }
    this.status.set('unavailable');
    return false;
  }

  private async isReady(): Promise<boolean> {
    try {
      return (await firstValueFrom(this.http.get<AiStatusResponse>(`${environment.apiBaseUrl}/ai/status`))).ready;
    } catch (error) {
      // Solo sin conexión o con un 5xx sigo esperando. Un 404 (backend aún sin este endpoint) o un 401
      // no deben frenar la clasificación: que sea ella la que responda.
      return error instanceof HttpErrorResponse && error.status !== 0 && error.status < 500;
    }
  }

  private isFresh(): boolean {
    return this.status() === 'ready' && Date.now() - this.lastReadyAt < this.config.readyFreshMs;
  }
}
