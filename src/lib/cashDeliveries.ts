/**
 * Entregas de Caja: cuándo una empleada le entrega al administrador el dinero de
 * las citas que cobró. No es un arqueo de caja — solo compara lo que el sistema
 * dice que se cobró contra lo recibido, por método de pago, y marca esos pagos
 * como entregados para que nunca se cuenten dos veces.
 */

export interface PendingPaymentLine {
  paymentMethodId: number;
  methodName: string;
  amount: number;
}

export interface PendingPayment {
  paymentId: number;
  appointmentId: number;
  date: string;
  customerName: string;
  services: string;
  methods: PendingPaymentLine[];
  total: number;
}

export interface EmployeePending {
  employeeId: number;
  employeeName: string;
  total: number;
  byMethod: { paymentMethodId: number; methodName: string; amount: number }[];
  paymentCount: number;
}

export interface MethodTotal {
  paymentMethodId: number;
  methodName: string;
  systemAmount: number;
  receivedAmount: number;
  difference: number;
}

export interface DeliverySummary {
  id: number;
  employeeName: string;
  receivedByName: string | null;
  deliveryDate: string;
  systemAmount: number;
  receivedAmount: number;
  difference: number;
}

export interface DeliveryDetailLine {
  customerName: string;
  date: string;
  service: string;
  methodName: string;
  reference: string | null;
  amount: number;
}

export interface DeliveryDetail extends DeliverySummary {
  notes: string | null;
  methodTotals: MethodTotal[];
  lines: DeliveryDetailLine[];
}

export const money = (n: number) => `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

/** Clase de color según la diferencia: 0 = verde, falta (negativo) = rojo, sobra (positivo) = amarillo. */
export function differenceClass(diff: number): string {
  if (Math.abs(diff) < 0.01) return 'text-success';
  return diff < 0 ? 'text-error' : 'text-warning';
}

export function differenceLabel(diff: number): string {
  if (Math.abs(diff) < 0.01) return 'L0.00';
  const sign = diff > 0 ? '+' : '−';
  return `${sign}${money(Math.abs(diff)).replace('L ', 'L')}`;
}
