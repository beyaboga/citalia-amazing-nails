/**
 * Tipos y helpers compartidos del módulo de esquema de pago y comisiones.
 *
 * Extiende el sistema de comisiones existente ([[commissions]]): cada empleado tiene
 * un esquema de pago (sueldo fijo / fijo + comisión / solo comisión) y, cuando aplica,
 * comisiones por servicio (porcentaje o monto fijo) calculadas sobre el precio total
 * o sin impuestos, según el ISV activo configurado en `tax_configurations`.
 */

export type PaymentScheme = 'FIXED' | 'FIXED_PLUS_COMMISSION' | 'COMMISSION_ONLY';

export const PAYMENT_SCHEME_LABELS: Record<PaymentScheme, string> = {
  FIXED: 'Sueldo fijo',
  FIXED_PLUS_COMMISSION: 'Sueldo fijo + comisión',
  COMMISSION_ONLY: 'Solo comisión',
};

export const PAYMENT_SCHEME_DESCRIPTIONS: Record<PaymentScheme, string> = {
  FIXED: 'No se calculan comisiones. Todos los reportes consideran únicamente el sueldo.',
  FIXED_PLUS_COMMISSION: 'Sueldo mensual más las comisiones generadas por los servicios realizados.',
  COMMISSION_ONLY: 'No hay sueldo base. El ingreso depende únicamente de las comisiones.',
};

/** ¿El esquema incluye sueldo mensual? */
export function schemeHasSalary(scheme: PaymentScheme): boolean {
  return scheme === 'FIXED' || scheme === 'FIXED_PLUS_COMMISSION';
}

/** ¿El esquema habilita configuración de comisiones por servicio? */
export function schemeHasCommission(scheme: PaymentScheme): boolean {
  return scheme === 'FIXED_PLUS_COMMISSION' || scheme === 'COMMISSION_ONLY';
}

/** Códigos de commission_types (catálogo en base). */
export type CommissionType = 'percentage' | 'fixed_amount';

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  percentage: 'Porcentaje',
  fixed_amount: 'Valor fijo',
};

/** Modo de cálculo de un esquema de comisión: por servicio (como hoy) o por el
 * monto total de la cita (rangos). Mutuamente excluyente dentro de un esquema. */
export type CalculationMode = 'PER_SERVICE' | 'TIERED_TOTAL';

export const CALCULATION_MODE_LABELS: Record<CalculationMode, string> = {
  PER_SERVICE: 'Por servicio',
  TIERED_TOTAL: 'Escalonado por monto de cita',
};

export type PayFrequency = 'BIWEEKLY' | 'MONTHLY';

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

/** Divisor del sueldo mensual según la frecuencia (quincenal = mitad). */
export function salaryForPeriod(monthlySalary: number, frequency: PayFrequency): number {
  const value = frequency === 'BIWEEKLY' ? monthlySalary / 2 : monthlySalary;
  return Math.round(value * 100) / 100;
}

/** Período por defecto según la frecuencia: mes actual, o quincena (1–15 / 16–fin). */
export function defaultPeriod(frequency: PayFrequency, ref: Date = new Date()): { from: string; to: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (frequency === 'BIWEEKLY') {
    return ref.getDate() <= 15
      ? { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m, 15)) }
      : { from: fmt(new Date(y, m, 16)), to: fmt(new Date(y, m + 1, 0)) };
  }
  return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
}

export type PeriodMode = 'MONTH' | 'CUSTOM';

/** Rango de un mes calendario específico (año, mes 1–12), sin depender de "hoy". */
export function monthPeriod(year: number, month: number): { from: string; to: string } {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(new Date(year, month - 1, 1)), to: fmt(new Date(year, month, 0)) };
}

/** Año y mes del mes calendario anterior a `ref` — el default sensato para abrir la pantalla de nómina. */
export function previousCalendarMonth(ref: Date = new Date()): { year: number; month: number } {
  const m = ref.getMonth(); // 0-11
  return m === 0 ? { year: ref.getFullYear() - 1, month: 12 } : { year: ref.getFullYear(), month: m };
}

/** "01 de julio de 2026 al 31 de julio de 2026" para mostrar el período elegido. */
export function formatPeriodRange(from: string, to: string): string {
  if (!from || !to) return '';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  return `${f.toLocaleDateString('es-HN', opts)} al ${t.toLocaleDateString('es-HN', opts)}`;
}

/** "Julio 2026" a partir del número de mes (1–12) y año. */
export function formatMonthYear(month: number, year: number): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-HN', opts);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type CalculationBase = 'GROSS' | 'NET';

export const CALCULATION_BASE_LABELS: Record<CalculationBase, string> = {
  GROSS: 'Precio total',
  NET: 'Precio sin impuestos',
};

export interface TaxConfiguration {
  id: number;
  name: string;
  percentage: number;
  isActive: boolean;
}

/** Monto en lempiras con dos decimales: 45680 → "L 45,680.00". */
export function formatLempiras(n: number): string {
  return `L ${(n ?? 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Etiqueta corta del valor de una comisión: "20%" o "L 150.00". */
export function formatCommissionValue(type: CommissionType, value: number): string {
  return type === 'percentage' ? `${value}%` : formatLempiras(value);
}
