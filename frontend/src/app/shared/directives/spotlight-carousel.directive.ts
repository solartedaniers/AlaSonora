import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Orquesta el carrusel automático de foco (.spotlight-cycle) entre las tarjetas
 * hijas: el ciclo en sí es CSS puro (animation-delay escalonado en styles.scss),
 * esta directiva solo pausa el grupo mientras el cursor está dentro y lo
 * reinicia desde la primera tarjeta al salir, quitando y reponiendo la clase
 * para forzar un reflow que resetee el animation-delay de cada tarjeta.
 */
@Directive({
  selector: '[appSpotlightCarousel]',
  standalone: true,
  host: {
    '[class.is-paused]': 'isPaused',
  },
})
export class SpotlightCarouselDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  isPaused = false;

  @HostListener('mouseenter')
  onEnter(): void {
    this.isPaused = true;
  }

  @HostListener('mouseleave')
  onLeave(): void {
    this.isPaused = false;
    this.restartCycle();
  }

  private restartCycle(): void {
    const cards: NodeListOf<HTMLElement> = this.el.nativeElement.querySelectorAll('.spotlight-cycle');
    cards.forEach((card: HTMLElement) => {
      card.classList.remove('spotlight-cycle');
      void card.offsetWidth; // fuerza reflow para que el navegador olvide el progreso de la animación
      card.classList.add('spotlight-cycle');
    });
  }
}
