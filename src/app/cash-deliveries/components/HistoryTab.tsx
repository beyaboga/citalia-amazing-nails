'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { money, differenceClass, differenceLabel, type DeliverySummary } from '@/lib/cashDeliveries';
import DeliveryDetailModal from './DeliveryDetailModal';

interface EmployeeOption { teamMemberId: number; name: string }

interface HistoryTabProps {
  employees: EmployeeOption[];
}

const HistoryTab = ({ employees }: HistoryTabProps) => {
  const [rows, setRows] = useState<DeliverySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (onlyDifferences) params.set('onlyDifferences', 'true');
      const res = await fetch(`/api/cash-deliveries?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el historial');
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, from, to, onlyDifferences]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="caption text-muted-foreground block mb-1">Empleada</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas</option>
              {employees.map((e) => <option key={e.teamMemberId} value={e.teamMemberId}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <label className="flex items-center gap-2 h-11 cursor-pointer select-none">
            <input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm text-foreground">Solo con diferencias</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="ClockIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No hay entregas registradas para estos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Empleada</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Recibido por</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.deliveryDate}</td>
                    <td className="px-4 py-3 font-medium text-primary">{r.employeeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.receivedByName ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">{money(r.receivedAmount)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${differenceClass(r.difference)}`}>
                      {differenceLabel(r.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openId !== null && <DeliveryDetailModal deliveryId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

export default HistoryTab;
