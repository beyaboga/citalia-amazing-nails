'use client';

import { useEffect } from 'react';
import type { ReceiptSettings } from '@/lib/payments';

/** Datos que se pintan en un recibo, vengan de un pago recién hecho o uno ya emitido. */
export interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  serviceLines: { serviceId: number; name: string; price: number; technicianName?: string | null }[];
  subtotal: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  methods: { name: string; amount: number; reference: string | null }[];
  cashierName: string;
  voided?: boolean;
}

export const money = (n: number) => `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

export function formatReceiptDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-HN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const statusLabel = (status: string) =>
  status === 'PAID' ? 'Pagado' : status === 'PARTIAL' ? 'Pago parcial' : 'Pendiente';

/** Factura / recibo imprimible. Sin botones: el contenedor decide qué acciones ofrecer. */
const ReceiptCard = ({ receipt, header }: { receipt: ReceiptData; header: ReceiptSettings | null }) => {
  // Mientras se ve la factura, el título de la pestaña es el número de recibo: así,
  // al imprimir o "Guardar como PDF", el archivo sale nombrado con ese número.
  useEffect(() => {
    const previousTitle = document.title;
    if (receipt.receiptNumber) document.title = receipt.receiptNumber;
    return () => {
      document.title = previousTitle;
    };
  }, [receipt.receiptNumber]);

  const hasTechnician = receipt.serviceLines.some((l) => l.technicianName);
  const groups = new Map<string, ReceiptData['serviceLines']>();
  if (hasTechnician) {
    for (const line of receipt.serviceLines) {
      const key = line.technicianName ?? 'Sin técnica';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(line);
    }
  }

  return (
    <div
      id="receipt"
      className="bg-card text-foreground rounded-lg border border-border shadow-warm max-w-md mx-auto relative overflow-hidden"
    >
      {receipt.voided && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-error/30 font-bold text-5xl -rotate-12 border-4 border-error/30 rounded-lg px-4 py-1">
            ANULADO
          </span>
        </div>
      )}

      {/* Encabezado centrado: negocio, "RECIBO DE PAGO" y el número debajo */}
      <div className="text-center px-6 pt-6 pb-4 border-b border-dashed border-border">
        {header?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={header.logoUrl} alt="" className="h-14 mx-auto mb-2 object-contain" />
        )}
        <h2 className="font-heading text-xl font-bold text-foreground leading-tight">
          {header?.businessName ?? 'Amazing Nails'}
        </h2>
        {header?.address && <p className="caption text-xs text-muted-foreground mt-0.5">{header.address}</p>}
        {header?.phone && <p className="caption text-xs text-muted-foreground">Tel: {header.phone}</p>}
        <p className="mt-3 text-sm font-semibold text-foreground">RECIBO DE PAGO</p>
        <p className="caption text-xs text-muted-foreground tabular-nums">{receipt.receiptNumber}</p>
      </div>

      {/* Fecha del servicio / cliente (etiqueta a la izquierda, valor a la derecha) */}
      <div className="px-6 py-3 space-y-1 text-sm border-b border-dashed border-border">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Fecha del servicio</span>
          <span className="font-medium text-foreground text-right">{formatReceiptDate(receipt.date)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium text-foreground text-right">{receipt.customerName}</span>
        </div>
      </div>

      {/* Detalle de servicios */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between pb-2 border-b border-border caption text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Descripción</span>
          <span>Importe</span>
        </div>

        <div className="pt-2 space-y-1 text-sm">
          {hasTechnician
            ? [...groups.entries()].map(([tech, lines]) => (
                <div key={tech} className="pt-1">
                  <p className="caption text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{tech}</p>
                  {lines.map((line, i) => (
                    <div key={`${line.serviceId}-${i}`} className="flex justify-between pl-2">
                      <span className="text-foreground">{line.name}</span>
                      <span className="tabular-nums text-foreground">{money(line.price)}</span>
                    </div>
                  ))}
                </div>
              ))
            : receipt.serviceLines.map((line) => (
                <div key={line.serviceId} className="flex justify-between">
                  <span className="text-foreground">{line.name}</span>
                  <span className="tabular-nums text-foreground">{money(line.price)}</span>
                </div>
              ))}
        </div>
      </div>

      {/* Totales */}
      <div className="px-6 pb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums text-foreground">{money(receipt.subtotal)}</span>
        </div>
        {receipt.discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuentos</span>
            <span className="tabular-nums text-success">− {money(receipt.discountAmount)}</span>
          </div>
        )}
        {receipt.tipAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Propina</span>
            <span className="tabular-nums text-foreground">{money(receipt.tipAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
          <span className="font-heading font-bold text-foreground">TOTAL</span>
          <span className="font-heading font-bold text-lg text-foreground tabular-nums">{money(receipt.totalAmount)}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-muted-foreground">Pagado ({statusLabel(receipt.paymentStatus)})</span>
          <span className="tabular-nums text-foreground">{money(receipt.paidAmount)}</span>
        </div>
        {receipt.pendingAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-warning">Pendiente</span>
            <span className="tabular-nums text-warning">{money(receipt.pendingAmount)}</span>
          </div>
        )}
      </div>

      {/* Método de pago */}
      <div className="px-6 py-3 border-t border-dashed border-border text-sm">
        <p className="caption text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Método de pago</p>
        {receipt.methods.map((m, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-foreground">
              {m.name}
              {m.reference ? ` · ${m.reference}` : ''}
            </span>
            <span className="tabular-nums text-foreground">{money(m.amount)}</span>
          </div>
        ))}
      </div>

      {/* Pie */}
      <div className="px-6 py-4 border-t border-dashed border-border text-center">
        <p className="caption text-xs text-muted-foreground">Cobrado por {receipt.cashierName}</p>
        {header?.footerMessage && <p className="mt-2 text-sm text-foreground">{header.footerMessage}</p>}
      </div>
    </div>
  );
};

export default ReceiptCard;
