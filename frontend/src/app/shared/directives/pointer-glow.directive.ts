import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Rastrea el puntero dentro del host y expone su posición como % vía las
 * CSS custom properties --glow-x/--glow-y, consumidas por .border-glow en styles.scss.
 */
@Directive({
  selector: '[appBorderGlow]',
  standalone: true,
  host: { class: 'border-glow' },
})
export class PointerGlowDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.el.nativeElement.style.setProperty('--glow-x', `${x}%`);
    this.el.nativeElement.style.setProperty('--glow-y', `${y}%`);
  }
}
