import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

const { minLength, maxLength, pattern, checkDebounceMs } = environment.username;

/** Formato del nombre de usuario: obligatorio, alfanumérico y con largo configurable. */
export const usernameValidators: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(minLength),
  Validators.maxLength(maxLength),
  Validators.pattern(pattern),
];

/**
 * Pregunto al backend si está libre (sin distinguir mayúsculas). `current` es el nombre que ya
 * tiene el usuario, para no marcar como ocupado el suyo propio al editar el perfil. Si la consulta
 * falla no bloqueo el formulario: el backend vuelve a validar al guardar.
 */
export function usernameAvailableValidator(
  check: (username: string) => Promise<{ available: boolean }>,
  current: () => string = () => ''
): AsyncValidatorFn {
  return async (control: AbstractControl): Promise<ValidationErrors | null> => {
    const value = String(control.value ?? '').trim();
    if (!value || value.toLowerCase() === current().toLowerCase()) return null;
    await new Promise((resolve) => setTimeout(resolve, checkDebounceMs));
    if (value !== String(control.value ?? '').trim()) return null;
    try {
      const { available } = await check(value);
      return available ? null : { usernameTaken: true };
    } catch {
      return null;
    }
  };
}
