import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Rastrea el puntero dentro del host y expone su posición como % vía las
 * CSS custom properties --glow-x/--glow-y, consumidas por las clases
 * .glow-cursor (halo de fondo) y .border-glow (borde) en styles.scss.
 * Un solo directive cubre ambos efectos porque comparten la misma mecánica
 * de seguimiento de puntero — solo cambia qué clase aplican.
 */
@Directive({
  selector: '[appGlowCursor], [appBorderGlow]',
  standalone: true,
  host: {
    '[class.glow-cursor]': 'isGlowCursor',
    '[class.border-glow]': 'isBorderGlow',
  },
})
export class PointerGlowDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly isGlowCursor = this.el.nativeElement.hasAttribute('appGlowCursor');
  readonly isBorderGlow = this.el.nativeElement.hasAttribute('appBorderGlow');

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.el.nativeElement.style.setProperty('--glow-x', `${x}%`);
    this.el.nativeElement.style.setProperty('--glow-y', `${y}%`);
  }
}
