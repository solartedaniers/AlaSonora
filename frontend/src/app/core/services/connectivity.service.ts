import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Reactive `navigator.onLine`, so any view can show the offline state without listening to window events itself. */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // En SSR se asume conexión: el servidor no tiene forma de saberlo.
  readonly online = signal(this.isBrowser ? navigator.onLine : true);

  constructor() {
    if (!this.isBrowser) return;
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
