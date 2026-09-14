import { AbstractControl, ValidationErrors } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;

/** Reglas mínimas de fuerza; cada clave presente en el error indica un requisito incumplido. */
export interface PasswordStrengthErrors {
  minLength?: true;
  noUppercase?: true;
  noNumber?: true;
}

export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  const errors: PasswordStrengthErrors = {};
  if (value.length < PASSWORD_MIN_LENGTH) errors.minLength = true;
  if (!/[A-Z]/.test(value)) errors.noUppercase = true;
  if (!/[0-9]/.test(value)) errors.noNumber = true;
  return Object.keys(errors).length > 0 ? errors : null;
}
