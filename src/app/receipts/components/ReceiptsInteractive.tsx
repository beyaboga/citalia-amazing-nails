'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import ReceiptCard, { money, type ReceiptData } from '@/components/common/ReceiptCard';
import type { ReceiptSettings } from '@/lib/payments';

interface ReceiptRow {
  id: number;
  receiptNumber: string;
  issuedDate: string;
  serviceDate: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  voided: boolean;
  cashierName: string;
}

const statusLabel = (s: string) => (s === 'PAID' ? 'Pagado' : s === 'PARTIAL' ? 'Parcial' : 'Pendiente');

const ReceiptsInteractive = () => {
  const { can } = useSession();
  const canVoid = can('payments.void');

  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [header, setHeader] = useState<ReceiptSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Detalle abierto (recibo a reimprimir/anular)
  const [detail, setDetail] = useState<(ReceiptData & { id: number; paymentId: number }) | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showVoid, setShowVoid] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/receipts').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/receipt-settings').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([list, h]) => {
        setReceipts(list);
        setHeader(h);
      })
      .catch(() => setError('No se pudieron cargar los recibos'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const openDetail = async (id: number) => {
    setError('');
    try {
      const res = await fetch(`/api/receipts/${id}`);
      if (!res.ok) throw new Error();
      setDetail(await res.json());
      setShowVoid(false);
      setVoidReason('');
    } catch {
      setError('No se pudo abrir el recibo');
    }
  };

  const handleVoid = async () => {
    if (!detail) return;
    if (!voidReason.trim()) return setError('Indique el motivo de la anulación');
    setVoiding(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${detail.paymentId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'No se pudo anular');
      setDetail(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular');
    } finally {
      setVoiding(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="text-error" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-10 text-center">
          <Icon name="ReceiptPercentIcon" size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aún no hay recibos emitidos.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Recibo</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Emitido</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{r.receiptNumber}</td>
                    <td className="px-4 py-3 text-foreground">{r.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.issuedDate}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{money(r.totalAmount)}</td>
                    <td className="px-4 py-3">
                      {r.voided ? (
                        <span className="caption text-xs px-2 py-0.5 rounded-full bg-error/10 text-error">Anulado</span>
                      ) : (
                        <span
                          className={`caption text-xs px-2 py-0.5 rounded-full ${
                            r.paymentStatus === 'PAID'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {statusLabel(r.paymentStatus)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(r.id)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle del recibo */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDetail(null)} aria-hidden="true" />
          <div className="relative w-full max-w-md my-8">
            <ReceiptCard receipt={detail} header={header} />

            <div className="mt-4 flex flex-wrap gap-2 justify-center print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth inline-flex items-center gap-2"
              >
                <Icon name="PrinterIcon" size={16} />
                Imprimir
              </button>
              {canVoid && !detail.voided && (
                <button
                  type="button"
                  onClick={() => setShowVoid((v) => !v)}
                  className="h-10 px-4 bg-error/10 text-error rounded-lg font-medium hover:bg-error/20 transition-smooth inline-flex items-center gap-2"
                >
                  <Icon name="NoSymbolIcon" size={16} />
                  Anular pago
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth"
              >
                Cerrar
              </button>
            </div>

            {showVoid && canVoid && !detail.voided && (
              <div className="mt-3 p-4 bg-card border border-border rounded-lg print:hidden">
                <label className="block text-sm font-medium text-foreground mb-1">Motivo de la anulación</label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ej: cobro duplicado"
                  className="w-full px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleVoid}
                  disabled={voiding}
                  className="mt-2 h-10 px-4 bg-error text-error-foreground rounded-lg font-medium hover:bg-error/90 transition-smooth disabled:opacity-50"
                >
                  {voiding ? 'Anulando...' : 'Confirmar anulación'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsInteractive;
