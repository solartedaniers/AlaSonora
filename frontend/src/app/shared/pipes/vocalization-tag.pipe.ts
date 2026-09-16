import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { xenoCantoVocalizationLabelKey } from '../../core/models';

/**
 * Pipe "impuro" a propósito, igual que TranslatePipe/SpeciesNamePipe: debe
 * re-evaluarse cuando cambia I18nService.lang. Traduce un tag de tipo de
 * vocalización de Xeno-canto (species.typicalVocalizations) si está en el
 * diccionario conocido; si no, muestra el texto tal cual vino de la fuente
 * en vez de romper — Xeno-canto es texto semi-libre, no un enum cerrado.
 */
@Pipe({
  name: 'vocalizationTag',
  standalone: true,
  pure: false,
})
export class VocalizationTagPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(rawType: string): string {
    this.i18n.lang();
    const key = xenoCantoVocalizationLabelKey(rawType);
    return key ? this.i18n.translate(key) : rawType;
  }
}
