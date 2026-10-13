import { mensajeErrorAuth } from './auth-error.util';

describe('mensajeErrorAuth', () => {
  it('muestra un mensaje específico para URL de redirección no permitida', () => {
    const mensaje = mensajeErrorAuth({ message: 'redirect URL not allowed' });
    expect(mensaje).toContain('URL de redirección');
  });

  it('pide revisar URL y clave para fallos fetch', () => {
    const mensaje = mensajeErrorAuth({ message: 'Failed to fetch' });
    expect(mensaje).toContain('Project URL');
    expect(mensaje).toContain('clave anon');
  });

  it('identifica un host que no resuelve por DNS', () => {
    const mensaje = mensajeErrorAuth({ message: 'net::ERR_NAME_NOT_RESOLVED' });
    expect(mensaje).toContain('Project URL');
    expect(mensaje).toContain('DNS');
  });
});
