/**
 * Seguimiento de clientes por categoría de servicio.
 *
 * La unidad de seguimiento es Cliente + Categoría (no por servicio individual):
 * el cálculo real vive en la función de base `recompute_customer_category_stats`
 * (ver `db/init/022_customer_followup.sql`), que se dispara sola con triggers al
 * completar/pagar una cita. Aquí solo viven tipos y presentación compartidos.
 */

export type FollowupStatus = 'ON_TIME' | 'UPCOMING' | 'OVERDUE' | 'INSUFFICIENT_DATA';

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  ON_TIME: 'A tiempo',
  UPCOMING: 'Próxima',
  OVERDUE: 'Vencida',
  INSUFFICIENT_DATA: 'Sin historial',
};

export const FOLLOWUP_STATUS_EMOJI: Record<FollowupStatus, string> = {
  ON_TIME: '🟢',
  UPCOMING: '🟡',
  OVERDUE: '🔴',
  INSUFFICIENT_DATA: '⚪',
};

export const FOLLOWUP_STATUS_CLASSES: Record<FollowupStatus, string> = {
  ON_TIME: 'bg-success/15 text-success',
  UPCOMING: 'bg-warning/20 text-warning-foreground',
  OVERDUE: 'bg-error/15 text-error',
  INSUFFICIENT_DATA: 'bg-muted text-muted-foreground',
};

export interface FollowupRow {
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  categoryId: number;
  categoryName: string;
  lastVisitDate: string | null;
  averageDays: number | null;
  estimatedNextVisit: string | null;
  totalVisits: number;
  status: FollowupStatus;
  daysLate: number | null;
}

export interface CategoryBreakdownRow {
  categoryId: number;
  categoryName: string;
  services: string[];
  totalVisits: number;
  averageDays: number | null;
  lastVisitDate: string | null;
  estimatedNextVisit: string | null;
  totalSpent: number;
  favoriteEmployeeName: string | null;
  status: FollowupStatus;
  daysLate: number | null;
}

/** "Cliente atrasado 10 días" / "Le corresponde regresar pronto" según el estado. */
export function followupStatusMessage(status: FollowupStatus, daysLate: number | null): string {
  if (status === 'OVERDUE' && daysLate !== null && daysLate > 0) return `Atrasado ${daysLate} día${daysLate === 1 ? '' : 's'}`;
  if (status === 'UPCOMING') return 'Le corresponde regresar pronto';
  if (status === 'ON_TIME') return 'Dentro de su comportamiento habitual';
  return 'Aún no hay suficiente historial';
}
