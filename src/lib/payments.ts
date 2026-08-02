/**
 * Tipos y helpers compartidos del módulo de pagos (cliente y servidor).
 *
 * El pago es una etapa posterior a la cita: no toca la lógica de citas ni los
 * precios originales. Las propinas se manejan siempre separadas del ingreso del
 * servicio ([[payments-module]]).
 */

export type PaymentMethodType = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER' | 'SPLIT_PAYMENT';

export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  'CASH',
  'TRANSFER',
  'CARD',
  'OTHER',
];

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta / POS',
  OTHER: 'Otro',
  SPLIT_PAYMENT: 'Dividir pago',
};

export interface PaymentMethod {
  id: number;
  name: string;
  type: PaymentMethodType;
  bank: string | null;
  account: string | null;
  isActive: boolean;
  displayOrder: number;
  isDefault: boolean;
  isSystem: boolean;
}

export type TipType = 'PERCENTAGE' | 'FIXED';

export const TIP_TYPE_LABELS: Record<TipType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED: 'Valor fijo',
};

export interface TipSetting {
  id: number;
  type: TipType;
  value: number;
  isActive: boolean;
  displayOrder: number;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';
export type TipReceivedBy = 'CASHIER' | 'EMPLOYEE';
export type TipStatus = 'PENDING_DISTRIBUTION' | 'DISTRIBUTED';

export interface ReceiptSettings {
  businessName: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  footerMessage: string | null;
}

export interface ReceiptNumbering {
  prefix: string;
  nextSequence: number;
  padding: number;
}

/** "FAC-" + 42 con relleno 5 → "FAC-00042". */
export function formatReceiptNumber(prefix: string, sequence: number, padding: number): string {
  return `${prefix}${String(sequence).padStart(padding, '0')}`;
}

/** Etiqueta de una opción de propina: "10%" o "L 50". */
export function formatTipOption(type: TipType, value: number): string {
  return type === 'PERCENTAGE' ? `${value}%` : `L ${value.toLocaleString()}`;
}

/**
 * Monto de propina para un subtotal dado. El porcentaje se calcula sobre el total
 * que se está cobrando (ya con descuentos); el fijo es el valor tal cual.
 */
export function computeTipAmount(type: TipType, value: number, base: number): number {
  const amount = type === 'PERCENTAGE' ? (base * value) / 100 : value;
  return Math.round(amount * 100) / 100;
}
