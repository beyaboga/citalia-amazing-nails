/**
 * Tipos y helpers compartidos del módulo de Gastos (egresos) y finanzas.
 *
 * Registra salidas de dinero y las reúne con los ingresos existentes (pagos de
 * citas) en la vista `cash_movements` para reportes de ingresos, egresos y utilidad.
 * No es inventario ni contabilidad. El formato de moneda se reutiliza de
 * [[payroll]] (`formatLempiras`).
 */

export type ExpenseStatus = 'PENDING' | 'PAID' | 'VOIDED';

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  VOIDED: 'Anulado',
};

export const EXPENSE_STATUS_CLASSES: Record<ExpenseStatus, string> = {
  PENDING: 'bg-warning/20 text-warning-foreground',
  PAID: 'bg-success/15 text-success',
  VOIDED: 'bg-error/15 text-error',
};

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  usageCount?: number;
}

export interface Expense {
  id: number;
  categoryId: number;
  categoryName: string;
  supplierName: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethodId: number;
  paymentMethodName: string;
  status: ExpenseStatus;
  hasReceipt: boolean;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

/** Comprobantes permitidos y límite de tamaño. */
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const RECEIPT_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
