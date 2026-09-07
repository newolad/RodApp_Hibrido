import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validadores reutilizables para los formularios reactivos de la app
 * (login, registro y, mas adelante, edicion de perfil).
 */

/** Exige al menos una minuscula, una mayuscula y un digito. */
export function passwordFuerteValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) return null;
    const ok = /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
    return ok ? null : { passwordDebil: true };
  };
}

/**
 * Valida que dos controles del mismo grupo coincidan (p. ej. password /
 * confirmacion). Se aplica sobre el FormGroup.
 */
export function camposCoincidenValidator(campoA: string, campoB: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(campoA)?.value;
    const b = group.get(campoB)?.value;
    if (a == null || b == null) return null;
    return a === b ? null : { noCoinciden: true };
  };
}
