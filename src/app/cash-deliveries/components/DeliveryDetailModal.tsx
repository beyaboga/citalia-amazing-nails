'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { money, differenceClass, differenceLabel, type DeliveryDetail } from '@/lib/cashDeliveries';

interface DeliveryDetailModalProps {
  deliveryId: number;
  onClose: () => void;
}

const DeliveryDetailModal = ({ deliveryId, onClose }: DeliveryDetailModalProps) => {
  const [detail, setDetail] = useState<DeliveryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/cash-deliveries/${deliveryId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDetail)
      .catch(() => setError('No se pudo cargar el detalle de la entrega'))
      .finally(() => setIsLoading(false));
  }, [deliveryId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-warm-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h3 className="font-heading font-semibold text-xl text-foreground">Detalle de la entrega</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Cerrar">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
            </div>
          ) : error || !detail ? (
            <p className="text-sm text-error">{error || 'Entrega no encontrada'}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="caption text-xs text-muted-foreground">Empleada</p>
                  <p className="font-medium text-foreground text-sm">{detail.employeeName}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="caption text-xs text-muted-foreground">Recibido por</p>
                  <p className="font-medium text-foreground text-sm">{detail.receivedByName ?? '—'}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="caption text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium text-foreground text-sm">{detail.deliveryDate}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="caption text-xs text-muted-foreground">Diferencia</p>
                  <p className={`font-semibold text-sm ${differenceClass(detail.difference)}`}>{differenceLabel(detail.difference)}</p>
                </div>
              </div>

              {detail.notes && (
                <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground">
                  <p className="caption text-xs text-muted-foreground mb-1">Observaciones</p>
                  {detail.notes}
                </div>
              )}

              <div>
                <h4 className="font-heading font-semibold text-foreground mb-2">Totales por método</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left caption text-xs font-semibold text-muted-foreground uppercase">Método</th>
                        <th className="px-3 py-2 text-right caption text-xs font-semibold text-muted-foreground uppercase">Sistema</th>
                        <th className="px-3 py-2 text-right caption text-xs font-semibold text-muted-foreground uppercase">Recibido</th>
                        <th className="px-3 py-2 text-right caption text-xs font-semibold text-muted-foreground uppercase">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.methodTotals.map((m) => (
                        <tr key={m.paymentMethodId}>
                          <td className="px-3 py-2 text-foreground">{m.methodName}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">{money(m.systemAmount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">{money(m.receivedAmount)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-medium ${differenceClass(m.difference)}`}>
                            {differenceLabel(m.difference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-heading font-semibold text-foreground mb-2">Citas incluidas</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left caption text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                        <th className="px-3 py-2 text-left caption text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                        <th className="px-3 py-2 text-left caption text-xs font-semibold text-muted-foreground uppercase">Método</th>
                        <th className="px-3 py-2 text-left caption text-xs font-semibold text-muted-foreground uppercase">Referencia</th>
                        <th className="px-3 py-2 text-right caption text-xs font-semibold text-muted-foreground uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.lines.map((line, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-foreground">{line.customerName}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{line.date}</td>
                          <td className="px-3 py-2 text-muted-foreground">{line.methodName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{line.reference ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">{money(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDetailModal;
