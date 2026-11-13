import {
  Moto,
  RegistroCombustible,
  RegistroMantenimiento,
  Rtm,
  Soat,
} from '@core/models/models';

/**
 * Calculos puros sobre los datos del garaje (sin Supabase ni Angular), para
 * reutilizarlos en Inicio, Detalle de moto, Mantenimiento, Notificaciones e
 * Historial y que todas las vistas digan exactamente lo mismo.
 */

/** Dias de anticipacion con que un documento pasa a "por vencer". */
export const DIAS_AVISO_VENCIMIENTO = 30;

/** Porcentaje de vida util desde el que un mantenimiento se considera urgente. */
export const UMBRAL_VIDA_UTIL = 25;

export type TipoChip = 'ok' | 'warn' | 'danger';

export interface EstadoVencimiento {
  /** Dias hasta el vencimiento (negativo si ya vencio). */
  dias: number;
  tipo: TipoChip;
  texto: string;
}

/** Convierte 'YYYY-MM-DD' en fecha local (sin el desfase UTC de `new Date(str)`). */
export function fechaLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Dias enteros entre hoy y la fecha dada. */
export function diasHasta(iso: string, hoy = new Date()): number {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fechaLocal(iso).getTime() - base.getTime()) / 86_400_000);
}

export function estadoVencimiento(fechaVencimiento: string, hoy = new Date()): EstadoVencimiento {
  const dias = diasHasta(fechaVencimiento, hoy);
  if (dias < 0) {
    return { dias, tipo: 'danger', texto: 'Vencido' };
  }
  if (dias <= DIAS_AVISO_VENCIMIENTO) {
    return { dias, tipo: 'warn', texto: dias === 0 ? 'Vence hoy' : `Vence en ${dias} d` };
  }
  return { dias, tipo: 'ok', texto: 'Vigente' };
}

/** El documento mas reciente (mayor fecha de vencimiento) de una moto. */
export function documentoVigente<T extends Soat | Rtm>(docs: T[], motoId: string): T | null {
  return (
    docs
      .filter((d) => d.moto_id === motoId)
      .sort((a, b) => b.fecha_vencimiento.localeCompare(a.fecha_vencimiento))[0] ?? null
  );
}

/**
 * Kilometraje actual estimado: el mayor entre el odometro inicial y cualquier
 * kilometraje registrado en tanqueadas o mantenimientos.
 */
export function kmActual(
  moto: Moto,
  combustible: RegistroCombustible[],
  mantenimientos: RegistroMantenimiento[],
): number {
  let km = Number(moto.odometro_inicial) || 0;
  for (const r of combustible) if (r.moto_id === moto.id) km = Math.max(km, Number(r.kilometraje));
  for (const r of mantenimientos) if (r.moto_id === moto.id) km = Math.max(km, Number(r.kilometraje));
  return km;
}

export interface EstadoComponente {
  tipo: string;
  /** Ultimo registro de este tipo de mantenimiento. */
  ultimo: RegistroMantenimiento;
  /** 0..100, o null si el registro no define `repetir_cada_km`. */
  vidaUtil: number | null;
  /** Km que faltan para el proximo servicio (negativo = atrasado). */
  kmRestantes: number | null;
}

/**
 * Estado por tipo de mantenimiento de una moto: toma el ultimo registro de cada
 * tipo y, si tiene intervalo, calcula la vida util restante.
 */
export function estadoComponentes(
  motoId: string,
  mantenimientos: RegistroMantenimiento[],
  km: number,
): EstadoComponente[] {
  const ultimos = new Map<string, RegistroMantenimiento>();
  for (const r of mantenimientos) {
    if (r.moto_id !== motoId) continue;
    const clave = r.tipo.trim().toLowerCase();
    const previo = ultimos.get(clave);
    if (!previo || Number(r.kilometraje) > Number(previo.kilometraje)) ultimos.set(clave, r);
  }

  return [...ultimos.values()]
    .map((ultimo) => {
      const intervalo = Number(ultimo.repetir_cada_km) || 0;
      if (intervalo <= 0) {
        return { tipo: ultimo.tipo, ultimo, vidaUtil: null, kmRestantes: null };
      }
      const recorrido = Math.max(0, km - Number(ultimo.kilometraje));
      const kmRestantes = intervalo - recorrido;
      const vidaUtil = Math.max(0, Math.min(100, Math.round((kmRestantes / intervalo) * 100)));
      return { tipo: ultimo.tipo, ultimo, vidaUtil, kmRestantes };
    })
    .sort((a, b) => (a.vidaUtil ?? 101) - (b.vidaUtil ?? 101));
}

const fmtNumero = new Intl.NumberFormat('es-CO');
const fmtMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const fmtFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatoKm = (km: number | null | undefined): string => `${fmtNumero.format(Number(km) || 0)} km`;
export const formatoMoneda = (v: number | null | undefined): string => fmtMoneda.format(Number(v) || 0);

/** Acepta 'YYYY-MM-DD' (fecha) o un timestamp ISO completo. */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  return fmtFecha.format(iso.length <= 10 ? fechaLocal(iso) : new Date(iso));
}

/** "Hace 2 h", "Ayer", "12 nov 2026"... para listas de avisos. */
export function haceCuanto(iso: string, ahora = new Date()): string {
  const diffMin = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  if (diffH < 48) return 'Ayer';
  return formatoFecha(iso);
}
