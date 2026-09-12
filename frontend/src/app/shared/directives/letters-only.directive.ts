import { Directive, HostListener } from '@angular/core';
import { NAME_PATTERN } from '../../core/validators/name.validator';

/** Bloquea en el teclado cualquier tecla que no sea letra, espacio o de control (evita números/símbolos antes de que lleguen al FormControl). */
@Directive({
  selector: '[appLettersOnly]',
  standalone: true,
})
export class LettersOnlyDirective {
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length > 1) return; // permite Backspace, flechas, Ctrl+V, etc.
    if (!NAME_PATTERN.test(event.key)) event.preventDefault();
  }
}
