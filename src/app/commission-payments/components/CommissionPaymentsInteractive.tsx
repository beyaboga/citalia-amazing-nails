'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import { exportCsv, exportXlsx } from '@/lib/exportTable';

interface CommissionEntry {
  id: number;
  serviceName: string | null;
  customerName: string;
  employeeName: string;
  teamMemberId: number;
  commissionAmount: number;
  status: string;
  date: string;
}

interface EmployeeOption {
  teamMemberId: number;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  paid: 'Pagada',
  voided: 'Anulada',
};

const CommissionPaymentsInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canPay = can('commissions.pay');

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('pending');

  // Filtros iniciales desde la URL (enlace "profundizar" desde reportes).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const emp = sp.get('employeeId');
    const st = sp.get('status');
    if (emp) setEmployeeId(emp);
    if (st) setStatus(st);
  }, []);

  useEffect(() => {
    fetch('/api/team-members')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        setEmployees(
          rows
            .filter((m) => m.isBookable && m.teamMemberId)
            .map((m) => ({ teamMemberId: m.teamMemberId, name: m.name }))
        );
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('status', status);
      const res = await fetch(`/api/commission-payments?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudieron cargar las comisiones');
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
      setSelected(new Set(data.entries.map((e: CommissionEntry) => e.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, from, to, status]);

  useEffect(() => {
    if (canPay) load();
  }, [canPay, load]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === entries.length) setSelected(new Set());
    else setSelected(new Set(entries.map((e) => e.id)));
  };

  const buildExportData = () => ({
    headers: ['Servicio', 'Cliente', 'Empleado', 'Fecha', 'Estado', 'Comisión'],
    rows: entries.map((e) => [
      e.serviceName ?? 'Comisión escalonada (cita completa)', e.customerName, e.employeeName, e.date,
      STATUS_LABELS[e.status] ?? e.status, e.commissionAmount,
    ]),
  });

  const selectedEntries = entries.filter((e) => selected.has(e.id) && (e.status === 'pending' || e.status === 'approved'));
  const selectedTotal = Math.round(selectedEntries.reduce((s, e) => s + e.commissionAmount, 0) * 100) / 100;
  const distinctEmployees = new Set(selectedEntries.map((e) => e.teamMemberId));

  const handlePay = async () => {
    setError('');
    setMessage('');
    if (selectedEntries.length === 0) return setError('Seleccione al menos una comisión pendiente');
    if (distinctEmployees.size > 1) return setError('Solo se pueden pagar comisiones de un mismo empleado a la vez');

    setIsPaying(true);
    try {
      const res = await fetch('/api/commission-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: selectedEntries.map((e) => e.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo pagar');
      setMessage(`Se pagaron ${data.paidCount} comisiones por ${formatLempiras(data.total)}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al pagar');
    } finally {
      setIsPaying(false);
    }
  };

  if (!sessionLoading && !canPay) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para pagar comisiones.</p>
      </div>
    );
  }

  const canPayNow = selectedEntries.length > 0 && status !== 'paid';

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="caption text-muted-foreground block mb-1">Empleado</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {employees.map((emp) => (
                <option key={emp.teamMemberId} value={emp.teamMemberId}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Fecha inicial</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Fecha final</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagada</option>
              <option value="all">Todas</option>
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
      {message && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0" />
          <span className="text-sm text-success font-medium">{message}</span>
        </div>
      )}

      {/* Listado */}
      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {entries.length > 0 && (
          <div className="p-4 border-b border-border flex justify-end gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv('comisiones.csv', d.headers, d.rows); }}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx('comisiones.xlsx', d.headers, d.rows); }}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> Excel
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="BanknotesIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No hay comisiones para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === entries.length && entries.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-primary"
                      aria-label="Seleccionar todas"
                    />
                  </th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Servicio</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Empleado</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                        disabled={e.status === 'paid'}
                        className="w-4 h-4 accent-primary disabled:opacity-40"
                        aria-label={`Seleccionar comisión ${e.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.serviceName ?? 'Comisión escalonada (cita completa)'}</td>
                    <td className="px-4 py-3 text-foreground">{e.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.employeeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          e.status === 'paid'
                            ? 'bg-success/15 text-success'
                            : e.status === 'voided'
                              ? 'bg-error/15 text-error'
                              : 'bg-warning/20 text-warning-foreground'
                        }`}
                      >
                        {STATUS_LABELS[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatLempiras(e.commissionAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.length > 0 && (
          <div className="p-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="caption text-muted-foreground">Total seleccionado</p>
              <p className="text-2xl font-heading font-semibold text-foreground">{formatLempiras(selectedTotal)}</p>
              <p className="caption text-muted-foreground text-xs">
                Total del listado: {formatLempiras(total)}
              </p>
            </div>
            <button
              onClick={handlePay}
              disabled={!canPayNow || isPaying}
              className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPaying ? <Icon name="ArrowPathIcon" size={20} className="animate-spin" /> : <Icon name="BanknotesIcon" size={20} />}
              Pagar comisiones
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionPaymentsInteractive;
