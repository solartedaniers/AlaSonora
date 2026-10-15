import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

// De la unidad más grande a la más chica: uso la primera que quepa al menos una vez.
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];
const MS_PER_SECOND = 1000;

/**
 * "hace 5 min" / "5 min ago" con Intl.RelativeTimeFormat del idioma activo. Impuro, como
 * TranslatePipe: se re-evalúa al cambiar de idioma y con cada detección de cambios.
 */
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const seconds = Math.round((new Date(value).getTime() - Date.now()) / MS_PER_SECOND);
    const [unit, size] = UNITS.find(([, unitSeconds]) => Math.abs(seconds) >= unitSeconds) ?? UNITS[UNITS.length - 1];
    return new Intl.RelativeTimeFormat(this.i18n.lang(), { numeric: 'auto', style: 'short' }).format(Math.round(seconds / size), unit);
  }
}
