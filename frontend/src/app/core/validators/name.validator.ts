import { Validators } from '@angular/forms';

/** Letras (incl. tildes y eñes) y espacios únicamente — sin dígitos ni símbolos. */
export const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;

export const nameValidator = Validators.pattern(NAME_PATTERN);
