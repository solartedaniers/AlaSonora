import { Injectable } from '@angular/core';

const PREFIX = '[AlaSonora]';

/**
 * Un solo formato para los fallos que la app captura y maneja: «[AlaSonora] Contexto: qué falló».
 * Solo registra; quien llama decide qué ve el usuario.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  error(context: string, message: string, cause: unknown): void {
    console.error(`${PREFIX} ${context}: ${message}`, cause);
  }

  warn(context: string, message: string, cause: unknown): void {
    console.warn(`${PREFIX} ${context}: ${message}`, cause);
  }
}
