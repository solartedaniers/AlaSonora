import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

/**
 * Pipe "impuro" a propósito: debe re-evaluarse cuando cambia el idioma
 * activo (I18nService.lang), lo cual no ocurre con un pipe puro estándar
 * porque el argumento (la clave) no cambia. El costo de recomputar es
 * insignificante frente a la ganancia de que todo el árbol de texto se
 * actualice reactivamente sin lógica manual de suscripción en cada componente.
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | undefined | null): string {
    if (!key) return '';
    // Leer el signal aquí asegura que Angular detecte la dependencia.
    this.i18n.lang();
    return this.i18n.translate(key);
  }
}
