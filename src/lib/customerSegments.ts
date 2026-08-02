/** Segmentación de clientes para el reporte de clientes. Ver [[customers-report]]. */

export type CustomerSegment = 'NUEVA' | 'FRECUENTE' | 'VIP' | 'INACTIVA' | 'REGULAR';

export const VIP_THRESHOLD = 10000;
export const FREQUENT_VISITS_90D = 3;
export const NEW_CUSTOMER_DAYS = 30;
export const INACTIVE_DAYS = 90;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export interface ClassifiableCustomer {
  registrationDate: string;
  firstVisit: string | null;
  lastVisit: string | null;
  visitCount: number;
  totalSpent: number;
  recentVisitCount: number;
}

/**
 * Una sola etiqueta por cliente, con prioridad: Inactiva > VIP > Frecuente > Nueva > Regular.
 *
 * "Nueva" se basa en la fecha de PRIMERA VISITA real, no en `registration_date`:
 * varios clientes fueron dados de alta en el sistema el mismo día (import masivo /
 * puesta en producción) aunque ya visitaban el salón desde antes — usar la fecha de
 * registro los clasificaría como "nuevas" incorrectamente. Solo se recurre a
 * `registrationDate` cuando el cliente nunca ha visitado (no hay otra señal).
 */
export function classifyCustomer(row: ClassifiableCustomer): CustomerSegment {
  if (row.visitCount === 0) {
    const regDays = daysSince(row.registrationDate) ?? Infinity;
    return regDays <= NEW_CUSTOMER_DAYS ? 'NUEVA' : 'INACTIVA';
  }
  const lastVisitDays = daysSince(row.lastVisit);
  if (lastVisitDays !== null && lastVisitDays > INACTIVE_DAYS) return 'INACTIVA';
  if (row.totalSpent >= VIP_THRESHOLD) return 'VIP';
  if (row.recentVisitCount >= FREQUENT_VISITS_90D) return 'FRECUENTE';
  const firstVisitDays = daysSince(row.firstVisit);
  if (firstVisitDays !== null && firstVisitDays <= NEW_CUSTOMER_DAYS) return 'NUEVA';
  return 'REGULAR';
}
