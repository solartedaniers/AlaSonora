import { Component, ChangeDetectionStrategy, computed, input, linkedSignal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { environment } from '../../../../environments/environment';

/** Etiqueta breve sobre la ilustración (tarjetas pequeñas) o ninguna (la pantalla muestra su propio aviso). */
export type SpeciesImageNotice = 'compact' | 'none';

/**
 * Foto de referencia de una especie. Si no hay URL o la imagen falla al cargar (evento error),
 * muestro la ilustración de la app con un aviso honesto en vez del texto alternativo roto.
 */
@Component({
  selector: 'app-species-image',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img [src]="current()" [alt]="alt()" [attr.loading]="loading()" (error)="onError()" />
    @if (missing() && notice() === 'compact') {
      <p class="species-image__notice">
        <span class="material-symbols-outlined" aria-hidden="true">add_a_photo</span>
        {{ 'species.imageMissingShort' | translate }}
      </p>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }
    /* En el carrusel 3D el aviso tampoco debe leerse en espejo desde atrás. */
    .species-image__notice {
      position: absolute;
      inset-inline-end: calc(var(--space-unit) * 1.5);
      inset-block-start: calc(var(--space-unit) * 1.5);
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) * 1.5);
      margin: 0;
      padding: calc(var(--space-unit) * 1) calc(var(--space-unit) * 2);
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--color-surface-container-lowest) 92%, transparent);
      color: var(--color-on-surface);
      font-size: var(--text-xs);
      line-height: var(--leading-snug);
      box-shadow: var(--shadow-md);
      backface-visibility: hidden;
    }
    .species-image__notice .material-symbols-outlined {
      font-size: var(--text-base);
      color: var(--color-primary);
    }
  `,
})
export class SpeciesImageComponent {
  readonly src = input<string | null | undefined>();
  readonly alt = input('');
  readonly notice = input<SpeciesImageNotice>('none');
  /** Público: la pantalla puede mostrar su propio aviso (p. ej. junto a "Subir mi foto"). */
  readonly loading = input<'lazy' | 'eager'>('lazy');

  /** Se reinicia al cambiar la URL: una foto nueva vuelve a intentarse. */
  private readonly failed = linkedSignal(() => {
    this.src();
    return false;
  });
  readonly missing = computed(() => !this.src() || this.failed());
  readonly current = computed(() => (this.missing() ? environment.speciesImageFallback : this.src()!));

  onError(): void {
    // Solo la foto real cae a la ilustración; si fallara la ilustración, no hay más que intentar.
    if (!this.missing()) this.failed.set(true);
  }
}
