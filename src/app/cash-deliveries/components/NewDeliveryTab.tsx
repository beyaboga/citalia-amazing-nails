'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import Icon from '@/components/ui/AppIcon';
import { money, differenceClass, differenceLabel, type PendingPayment } from '@/lib/cashDeliveries';

interface EmployeeOption { teamMemberId: number; name: string }
interface MethodOption { id: number; name: string }

interface NewDeliveryTabProps {
  employees: EmployeeOption[];
  methods: MethodOption[];
  selectedEmployeeId: string;
  onEmployeeChange: (id: string) => void;
  onDelivered: () => void;
}

const NewDeliveryTab = ({ employees, methods, selectedEmployeeId, onEmployeeChange, onDelivered }: NewDeliveryTabProps) => {
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [received, setReceived] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [expandedMethod, setExpandedMethod] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPending = useCallback(async () => {
    if (!selectedEmployeeId) {
      setPending([]);
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/cash-deliveries/pending?employeeId=${selectedEmployeeId}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudieron cargar las citas pendientes');
      const rows: PendingPayment[] = await res.json();
      setPending(rows);
      setSelectedIds(new Set(rows.map((r) => r.paymentId))); // todas marcadas por defecto
      setReceived({});
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const toggle = (paymentId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (prev.size === pending.length ? new Set() : new Set(pending.map((p) => p.paymentId))));
  };

  // Totales del sistema por método, recalculados en vivo según la selección.
  const systemByMethod = useMemo(() => {
    const map = new Map<number, { methodId: number; methodName: string; amount: number }>();
    for (const p of pending) {
      if (!selectedIds.has(p.paymentId)) continue;
      for (const m of p.methods) {
        const existing = map.get(m.paymentMethodId);
        map.set(m.paymentMethodId, {
          methodId: m.paymentMethodId,
          methodName: m.methodName,
          amount: Math.round(((existing?.amount ?? 0) + m.amount) * 100) / 100,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [pending, selectedIds]);

  const systemTotal = useMemo(
    () => Math.round(systemByMethod.reduce((s, m) => s + m.amount, 0) * 100) / 100,
    [systemByMethod]
  );
  const receivedTotal = useMemo(
    () => Math.round(systemByMethod.reduce((s, m) => s + (Number(received[m.methodId]) || 0), 0) * 100) / 100,
    [systemByMethod, received]
  );
  const overallDifference = Math.round((receivedTotal - systemTotal) * 100) / 100;

  const linesForMethod = (methodId: number) =>
    pending
      .filter((p) => selectedIds.has(p.paymentId) && p.methods.some((m) => m.paymentMethodId === methodId))
      .map((p) => ({
        customerName: p.customerName,
        date: p.date,
        amount: p.methods.find((m) => m.paymentMethodId === methodId)!.amount,
      }));

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return setError('Seleccione al menos una cita');
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      const receivedByMethod: Record<number, number> = {};
      for (const m of systemByMethod) receivedByMethod[m.methodId] = Number(received[m.methodId]) || 0;

      const res = await fetch('/api/cash-deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: Number(selectedEmployeeId),
          paymentIds: [...selectedIds],
          receivedByMethod,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la entrega');
      setMessage(`Entrega confirmada. Total recibido: ${money(data.receivedAmount)}.`);
      onDelivered();
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar la entrega');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <label className="caption text-muted-foreground block mb-1">Empleada</label>
        <select
          value={selectedEmployeeId}
          onChange={(e) => onEmployeeChange(e.target.value)}
          className="w-full sm:w-80 h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Seleccione una empleada…</option>
          {employees.map((e) => <option key={e.teamMemberId} value={e.teamMemberId}>{e.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}
      {message && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0" />
          <span className="text-sm text-success font-medium">{message}</span>
        </div>
      )}

      {!selectedEmployeeId ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Icon name="UserGroupIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Selecciona una empleada para ver sus citas pendientes de entrega</p>
        </div>
      ) : isLoading ? (
        <div className="p-12 flex items-center justify-center text-muted-foreground bg-card rounded-lg border border-border">
          <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Icon name="CheckCircleIcon" size={40} className="text-success mx-auto mb-3" />
          <p className="text-foreground font-medium">Esta empleada no tiene citas pendientes de entrega</p>
        </div>
      ) : (
        <>
          {/* Listado de citas pendientes */}
          <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selectedIds.size === pending.length} onChange={toggleAll} className="w-4 h-4 accent-primary" aria-label="Seleccionar todas" />
                    </th>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Servicio</th>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Método de pago</th>
                    <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((p) => (
                    <tr key={p.paymentId} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(p.paymentId)} onChange={() => toggle(p.paymentId)} className="w-4 h-4 accent-primary" aria-label={`Seleccionar cita de ${p.customerName}`} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.date}</td>
                      <td className="px-4 py-3 text-foreground">{p.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.services || '—'}</td>
                      <td className="px-4 py-3 text-foreground">{p.methods.map((m) => m.methodName).join(' + ')}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{money(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen por método + recibido + diferencia */}
          <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-heading font-semibold text-lg text-foreground">Totales por método de pago</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Método</th>
                    <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Sistema</th>
                    <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Recibido</th>
                    <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Diferencia</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {systemByMethod.map((m) => {
                    const receivedValue = received[m.methodId] ?? '';
                    const diff = Math.round(((Number(receivedValue) || 0) - m.amount) * 100) / 100;
                    const isOpen = expandedMethod === m.methodId;
                    return (
                      <Fragment key={m.methodId}>
                        <tr className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium text-foreground">{m.methodName}</td>
                          <td className="px-4 py-3 text-right text-foreground tabular-nums">{money(m.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground text-xs">L</span>
                              <input
                                type="number" min={0} step="0.01"
                                value={receivedValue}
                                onChange={(e) => setReceived({ ...received, [m.methodId]: e.target.value })}
                                placeholder="0.00"
                                className="w-28 h-9 px-2 rounded-md border border-border bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${differenceClass(diff)}`}>
                            {receivedValue === '' ? '—' : differenceLabel(diff)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedMethod(isOpen ? null : m.methodId)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                              aria-label="Ver detalle"
                            >
                              <Icon name={isOpen ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} />
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/10">
                            <td colSpan={5} className="px-6 py-3">
                              <p className="caption text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Detalle de {m.methodName}
                              </p>
                              <div className="space-y-1 text-xs">
                                {linesForMethod(m.methodId).map((line, i) => (
                                  <div key={i} className="flex justify-between text-foreground">
                                    <span>{line.customerName} · {line.date}</span>
                                    <span className="tabular-nums font-medium">{money(line.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{money(systemTotal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{money(receivedTotal)}</td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${differenceClass(overallDifference)}`}>
                      {differenceLabel(overallDifference)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-6 border-t border-border space-y-4">
              <div>
                <label className="caption text-muted-foreground block mb-1">Observaciones (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej: faltaron L150 en efectivo, la empleada dice que fue un descuento no registrado"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleConfirm}
                disabled={isSaving || selectedIds.size === 0}
                className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Icon name="ArrowPathIcon" size={20} className="animate-spin" /> : <Icon name="CheckCircleIcon" size={20} />}
                Confirmar Entrega
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewDeliveryTab;
