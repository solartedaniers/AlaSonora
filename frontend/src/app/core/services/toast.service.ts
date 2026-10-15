import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Aviso breve que sobrevive a la navegación (lo pinta ToastComponent en la raíz). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Clave i18n del aviso visible, o null. */
  readonly messageKey = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(messageKey: string, durationMs = environment.toastMs): void {
    clearTimeout(this.timer);
    this.messageKey.set(messageKey);
    this.timer = setTimeout(() => this.messageKey.set(null), durationMs);
  }
}
