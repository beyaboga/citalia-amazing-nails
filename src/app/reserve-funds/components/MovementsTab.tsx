'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  AUTO_SERVICE_COST: 'Costo automático',
  AUTO_COMMISSION: 'Comisión automática',
  AUTO_FIXED: 'Monto fijo automático',
  AUTO_PERCENTAGE: 'Porcentaje automático',
  COMMISSION_PAYOUT: 'Pago de comisión',
  MANUAL_CONTRIBUTION: 'Aporte manual',
  MANUAL_WITHDRAWAL: 'Retiro manual',
};

interface FundOption {
  id: number;
  name: string;
}
interface PeriodOption {
  id: number;
  year: number;
  month: number;
  status: string;
}
interface Movement {
  id: number;
  date: string;
  movementType: string;
  direction: 'IN' | 'OUT';
  amount: number;
  concept: string;
  notes: string | null;
  voided: boolean;
  receiptNumber: string | null;
  customerName: string | null;
  employeeName: string | null;
  balance: number;
}

const MovementsTab = () => {
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [fundId, setFundId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reserve-funds/funds')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: FundOption[]) => {
        setFunds(rows);
        if (rows.length > 0) setFundId(String(rows[0].id));
      })
      .catch(() => {});
    fetch('/api/reserve-funds/periods')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: PeriodOption[]) => {
        setPeriods(rows);
        const open = rows.find((p) => p.status === 'OPEN');
        if (open) setPeriodId(String(open.id));
        else if (rows.length > 0) setPeriodId(String(rows[0].id));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!fundId) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (periodId) params.set('periodId', periodId);
      const res = await fetch(`/api/reserve-funds/funds/${fundId}/movements?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el historial');
      const data = await res.json();
      setMovements(data.movements);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [fundId, periodId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="caption text-muted-foreground block mb-1">Fondo</label>
            <select
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Período</label>
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {MONTH_NAMES[p.month - 1]} {p.year}{' '}
                  {p.status === 'OPEN' ? '(abierto)' : '(cerrado)'}
                </option>
              ))}
            </select>
          </div>
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
        ) : movements.length === 0 ? (
          <div className="p-12 text-center">
            <Icon
              name="ArrowsRightLeftIcon"
              size={40}
              className="text-muted-foreground mx-auto mb-3"
            />
            <p className="text-foreground font-medium">Sin movimientos en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-3 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-3 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Venta
                  </th>
                  <th className="px-3 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-3 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-3 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Concepto
                  </th>
                  <th className="px-3 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Entrada
                  </th>
                  <th className="px-3 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-3 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => (
                  <tr key={m.id} className={`hover:bg-muted/20 ${m.voided ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}
                      {m.voided && <span className="ml-1 text-error text-xs">(anulado)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {m.receiptNumber ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{m.customerName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{m.employeeName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-foreground">{m.concept}</td>
                    <td className="px-3 py-2.5 text-right text-success font-medium tabular-nums">
                      {m.direction === 'IN' ? formatLempiras(m.amount) : ''}
                    </td>
                    <td className="px-3 py-2.5 text-right text-error font-medium tabular-nums">
                      {m.direction === 'OUT' ? formatLempiras(m.amount) : ''}
                    </td>
                    <td className="px-3 py-2.5 text-right text-foreground font-semibold tabular-nums">
                      {formatLempiras(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementsTab;
