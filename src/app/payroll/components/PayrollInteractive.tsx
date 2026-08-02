'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import {
  formatLempiras, PAY_FREQUENCY_LABELS, PAYMENT_SCHEME_LABELS,
  monthPeriod, previousCalendarMonth, formatPeriodRange, formatMonthYear,
  type PayFrequency, type PaymentScheme, type PeriodMode,
} from '@/lib/payroll';

interface EmployeeOption { teamMemberId: number; name: string }
interface MethodOption { id: number; name: string }

interface Preview {
  employee: { teamMemberId: number; name: string; scheme: PaymentScheme; payFrequency: PayFrequency };
  periodStart: string;
  periodEnd: string;
  salary: number;
  commissions: {
    total: number;
    included: boolean;
    items: { id: number; service: string; customer: string; amount: number; date: string }[];
  };
  advances: { total: number; items: { id: number; date: string; amount: number; method: string; notes: string | null }[] };
  gross: number;
  net: number;
}

interface HistoryRow {
  id: number;
  periodStart: string;
  periodEnd: string;
  periodMonth: number | null;
  periodYear: number | null;
  isCustomRange: boolean;
  includeCommissions: boolean;
  salaryAmount: number;
  commissionAmount: number;
  advanceDeduction: number;
  netAmount: number;
  paidAt: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const initialMonth = () => {
  const { year, month } = previousCalendarMonth();
  return `${year}-${String(month).padStart(2, '0')}`;
};

const PayrollInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canPay = can('payroll.pay');

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [paying, setPaying] = useState(false);

  // Período de nómina: mes completo o rango personalizado.
  const [periodMode, setPeriodMode] = useState<PeriodMode>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Comisiones de esta liquidación.
  const [includeCommissions, setIncludeCommissions] = useState(true);
  const [showCommissionDetail, setShowCommissionDetail] = useState(false);
  const [showAdvanceDetail, setShowAdvanceDetail] = useState(false);

  // Historial de nóminas pagadas.
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal de adelanto
  const [advOpen, setAdvOpen] = useState(false);
  const [advAmount, setAdvAmount] = useState('');
  const [advDate, setAdvDate] = useState(today());
  const [advMethod, setAdvMethod] = useState('');
  const [advNotes, setAdvNotes] = useState('');
  const [advSaving, setAdvSaving] = useState(false);

  useEffect(() => {
    fetch('/api/team-members').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setEmployees(rows.filter((m) => m.isBookable && m.teamMemberId).map((m) => ({ teamMemberId: m.teamMemberId, name: m.name })))
    ).catch(() => {});
    fetch('/api/payment-methods').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setMethods(rows.filter((m) => m.isActive && m.type !== 'SPLIT_PAYMENT').map((m) => ({ id: m.id, name: m.name })))
    ).catch(() => {});
  }, []);

  const { from, to } = useMemo(() => {
    if (periodMode === 'CUSTOM') return { from: customFrom, to: customTo };
    if (!selectedMonth) return { from: '', to: '' };
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return { from: '', to: '' };
    return monthPeriod(y, m);
  }, [periodMode, selectedMonth, customFrom, customTo]);

  const loadPreview = useCallback(async (id: string, periodFrom: string, periodTo: string, withCommissions: boolean) => {
    if (!id || !periodFrom || !periodTo) { setPreview(null); return; }
    setLoadingPreview(true);
    setError('');
    setMessage('');
    try {
      const params = new URLSearchParams({
        employeeId: id, from: periodFrom, to: periodTo, includeCommissions: String(withCommissions),
      });
      const res = await fetch(`/api/payroll/preview?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar la planilla');
      setPreview(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    loadPreview(employeeId, from, to, includeCommissions);
  }, [employeeId, from, to, includeCommissions, loadPreview]);

  const loadHistory = useCallback(async (id: string) => {
    if (!id) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/payroll/history?employeeId=${id}`);
      setHistory(res.ok ? await res.json() : []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(employeeId); }, [employeeId, loadHistory]);

  const handlePay = async () => {
    if (!preview || !payMethod) return setError('Seleccione el método de pago');
    setPaying(true);
    setError('');
    setMessage('');
    try {
      const [selYear, selMonth] = selectedMonth.split('-').map(Number);
      const res = await fetch('/api/payroll/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: preview.employee.teamMemberId,
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
          paymentMethodId: Number(payMethod),
          includeCommissions,
          periodMode,
          ...(periodMode === 'MONTH' && selYear && selMonth ? { periodMonth: selMonth, periodYear: selYear } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo pagar');
      setMessage(`Planilla pagada: ${formatLempiras(data.net)} netos.`);
      setPayMethod('');
      await loadPreview(employeeId, from, to, includeCommissions);
      await loadHistory(employeeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al pagar');
    } finally {
      setPaying(false);
    }
  };

  const handleAdvance = async () => {
    setError('');
    if (!(Number(advAmount) > 0)) return setError('El monto del adelanto debe ser mayor a 0');
    if (!advMethod) return setError('Seleccione el método del adelanto');
    setAdvSaving(true);
    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: Number(employeeId), amount: Number(advAmount), advanceDate: advDate, paymentMethodId: Number(advMethod), notes: advNotes }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo registrar el adelanto');
      setAdvOpen(false);
      setAdvAmount(''); setAdvNotes(''); setAdvMethod('');
      setMessage('Adelanto registrado.');
      await loadPreview(employeeId, from, to, includeCommissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el adelanto');
    } finally {
      setAdvSaving(false);
    }
  };

  if (!sessionLoading && !canPay) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para pagar la planilla.</p>
      </div>
    );
  }

  const effectiveCommission = preview ? (includeCommissions ? preview.commissions.total : 0) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between">
          <div className="flex-1 max-w-sm">
            <label className="caption text-muted-foreground block mb-1">Empleado</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Seleccione un empleado…</option>
              {employees.map((e) => <option key={e.teamMemberId} value={e.teamMemberId}>{e.name}</option>)}
            </select>
          </div>
          {employeeId && (
            <button onClick={() => { setAdvOpen(true); setAdvMethod(''); setAdvAmount(''); setAdvNotes(''); setAdvDate(today()); }}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth flex items-center justify-center gap-2 flex-shrink-0">
              <Icon name="PlusIcon" size={18} /> Registrar adelanto
            </button>
          )}
        </div>
      </div>

      {employeeId && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
          <h3 className="font-heading font-semibold text-foreground">Período de nómina</h3>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={periodMode === 'CUSTOM'}
              onChange={(e) => setPeriodMode(e.target.checked ? 'CUSTOM' : 'MONTH')}
              className="rounded border-border" />
            Usar rango de fechas personalizado
          </label>

          {periodMode === 'MONTH' ? (
            <div className="max-w-xs">
              <label className="caption text-muted-foreground block mb-1">Mes</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="caption text-muted-foreground block mb-1">Fecha inicio</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="caption text-muted-foreground block mb-1">Fecha final</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}

          {from && to && (
            <p className="caption text-muted-foreground text-sm">
              Período seleccionado: <span className="text-foreground font-medium">{formatPeriodRange(from, to)}</span>
            </p>
          )}
        </div>
      )}

      {employeeId && (
        <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
          <h3 className="font-heading font-semibold text-foreground mb-3">Comisiones</h3>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={includeCommissions}
              onChange={(e) => setIncludeCommissions(e.target.checked)}
              className="rounded border-border" />
            Incluir comisiones pendientes en esta nómina
          </label>
        </div>
      )}

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

      {loadingPreview ? (
        <div className="p-12 flex items-center justify-center text-muted-foreground bg-card rounded-lg border border-border">
          <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
        </div>
      ) : preview ? (
        <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-heading font-semibold text-lg text-foreground">{preview.employee.name}</h3>
            <p className="caption text-muted-foreground text-sm">
              {PAYMENT_SCHEME_LABELS[preview.employee.scheme]} · {PAY_FREQUENCY_LABELS[preview.employee.payFrequency]} · período {preview.periodStart} a {preview.periodEnd}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between text-foreground">
              <span>Sueldo del período</span>
              <span className="font-medium">{formatLempiras(preview.salary)}</span>
            </div>

            <div className="flex justify-between items-center text-foreground">
              {preview.commissions.items.length > 0 ? (
                <button type="button" onClick={() => setShowCommissionDetail((v) => !v)}
                  className="flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">
                  <span>Comisiones pendientes <span className="caption text-muted-foreground text-xs">({preview.commissions.items.length})</span></span>
                  <Icon name={showCommissionDetail ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} />
                </button>
              ) : (
                <span>Comisiones pendientes</span>
              )}
              <span className={`font-medium ${includeCommissions ? '' : 'text-muted-foreground italic'}`}>
                {includeCommissions ? formatLempiras(preview.commissions.total) : 'No incluidas'}
              </span>
            </div>

            {showCommissionDetail && preview.commissions.items.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                        <th className="px-3 py-2 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                        <th className="px-3 py-2 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Servicio</th>
                        <th className="px-3 py-2 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Comisión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.commissions.items.map((c) => (
                        <tr key={c.id}>
                          <td className="px-3 py-2 text-foreground whitespace-nowrap">{c.date}</td>
                          <td className="px-3 py-2 text-foreground">{c.customer}</td>
                          <td className="px-3 py-2 text-foreground">{c.service}</td>
                          <td className="px-3 py-2 text-right text-foreground whitespace-nowrap">{formatLempiras(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t border-border">
                      <tr>
                        <td className="px-3 py-2 font-semibold text-foreground" colSpan={3}>Total</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{formatLempiras(preview.commissions.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-foreground">
              {preview.advances.items.length > 0 ? (
                <button type="button" onClick={() => setShowAdvanceDetail((v) => !v)}
                  className="flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">
                  <span>Adelantos a descontar <span className="caption text-muted-foreground text-xs">({preview.advances.items.length})</span></span>
                  <Icon name={showAdvanceDetail ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} />
                </button>
              ) : (
                <span>Adelantos a descontar</span>
              )}
              <span className="font-medium text-error">− {formatLempiras(preview.advances.total)}</span>
            </div>

            {showAdvanceDetail && preview.advances.items.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                        <th className="px-3 py-2 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Método</th>
                        <th className="px-3 py-2 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Notas</th>
                        <th className="px-3 py-2 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.advances.items.map((a) => (
                        <tr key={a.id}>
                          <td className="px-3 py-2 text-foreground whitespace-nowrap">{a.date}</td>
                          <td className="px-3 py-2 text-foreground">{a.method}</td>
                          <td className="px-3 py-2 text-muted-foreground">{a.notes || '—'}</td>
                          <td className="px-3 py-2 text-right text-foreground whitespace-nowrap">{formatLempiras(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t border-border">
                      <tr>
                        <td className="px-3 py-2 font-semibold text-foreground" colSpan={3}>Total</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{formatLempiras(preview.advances.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="font-heading font-semibold text-lg text-foreground">Neto a pagar</span>
              <span className="font-heading font-semibold text-2xl text-foreground">{formatLempiras(preview.net)}</span>
            </div>

            {preview.advances.total > preview.gross && (
              <p className="caption text-warning-foreground bg-warning/15 rounded-lg p-2 text-xs">
                Los adelantos superan el pago del período; el neto queda en L 0.00 y se liquidarán todos.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="flex-1 h-12 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Método de pago…</option>
                {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={handlePay} disabled={paying || (preview.salary === 0 && effectiveCommission === 0 && preview.advances.total === 0)}
                className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2">
                {paying ? <Icon name="ArrowPathIcon" size={20} className="animate-spin" /> : <Icon name="BanknotesIcon" size={20} />}
                Pagar planilla
              </button>
            </div>
          </div>
        </div>
      ) : employeeId ? null : (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Icon name="UsersIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Seleccione un empleado para ver su planilla</p>
        </div>
      )}

      {employeeId && (
        <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-heading font-semibold text-foreground">Historial de nóminas pagadas</h3>
          </div>
          {loadingHistory ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground">
              <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="p-6 caption text-muted-foreground text-sm">Aún no hay nóminas pagadas para este empleado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Período</th>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha de pago</th>
                    <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Comisiones</th>
                    <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Neto pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">
                        {h.isCustomRange || !h.periodMonth || !h.periodYear
                          ? `${h.periodStart} al ${h.periodEnd}`
                          : formatMonthYear(h.periodMonth, h.periodYear)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(h.paidAt).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{h.includeCommissions ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatLempiras(h.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal adelanto */}
      {advOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40" onClick={() => setAdvOpen(false)}>
          <div className="bg-card rounded-xl shadow-warm-lg border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-heading font-semibold text-xl text-foreground">Registrar adelanto</h3>
              <button onClick={() => setAdvOpen(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Cerrar">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="caption text-muted-foreground block mb-1">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">L</span>
                    <input type="number" min={0} step="0.01" value={advAmount} onChange={(e) => setAdvAmount(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="caption text-muted-foreground block mb-1">Fecha</label>
                  <input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="caption text-muted-foreground block mb-1">Método</label>
                <select value={advMethod} onChange={(e) => setAdvMethod(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Seleccione…</option>
                  {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="caption text-muted-foreground block mb-1">Notas (opcional)</label>
                <input type="text" value={advNotes} onChange={(e) => setAdvNotes(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-border">
              <button onClick={handleAdvance} disabled={advSaving}
                className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 flex items-center justify-center gap-2">
                {advSaving ? <Icon name="ArrowPathIcon" size={18} className="animate-spin" /> : <Icon name="CheckIcon" size={18} />}
                Registrar
              </button>
              <button onClick={() => setAdvOpen(false)} disabled={advSaving}
                className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollInteractive;
