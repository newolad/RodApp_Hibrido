/**
 * Traduce los errores de Supabase Auth a mensajes en espanol aptos para el
 * usuario final. Evita filtrar detalles tecnicos y mantiene un tono consistente
 * en login y registro.
 */
export function mensajeErrorAuth(error: unknown): string {
  const raw =
    (error as { message?: string })?.message?.toLowerCase() ??
    String(error ?? '').toLowerCase();

  if (raw.includes('invalid login credentials')) {
    return 'Correo o contrasena incorrectos.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada.';
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'Ya existe una cuenta con este correo. Inicia sesion.';
  }
  if (raw.includes('password should be at least')) {
    return 'La contrasena es demasiado corta (minimo 6 caracteres).';
  }
  if (raw.includes('unable to validate email address') || raw.includes('invalid email')) {
    return 'El correo no tiene un formato valido.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  }
  if (
    (raw.includes('redirect') && (raw.includes('not allowed') || raw.includes('invalid') || raw.includes('mismatch'))) ||
    raw.includes('redirect uri') ||
    raw.includes('redirect_url') ||
    raw.includes('redirect url')
  ) {
    return 'La URL de redirección no coincide con la configuración de Supabase. Revisa Auth > URL Configuration.';
  }
  if (raw.includes('err_name_not_resolved') || raw.includes('name not resolved') || raw.includes('dns')) {
    return 'No se encuentra el servidor configurado. Verifica el Project URL de Supabase y tu DNS.';
  }
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return 'No se pudo conectar con Supabase. Verifica el Project URL y la clave anon del proyecto, además de tu conexión.';
  }
  if (raw.includes('popup') || raw.includes('cancelled') || raw.includes('canceled')) {
    return 'Inicio de sesion con Google cancelado.';
  }
  return 'Ocurrio un error inesperado. Intenta nuevamente.';
}
