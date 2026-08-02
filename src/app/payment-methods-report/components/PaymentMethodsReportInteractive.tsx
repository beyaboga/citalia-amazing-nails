'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';

interface MethodRow {
  id: number;
  name: string;
  transactionCount: number;
  totalReceived: number;
}

interface Option { id: number; name: string }

const PaymentMethodsReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('reports.view');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const [employees, setEmployees] = useState<Option[]>([]);
  const [rows, setRows] = useState<MethodRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { from, to } = useMemo(() => rangeForPreset(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  useEffect(() => {
    fetch('/api/team-members').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setEmployees(rows.filter((m) => m.isBookable).map((m) => ({ id: m.teamMemberId, name: m.name })))
    ).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (employeeId) params.set('employeeId', employeeId);
      const res = await fetch(`/api/reports/payment-methods?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, employeeId]);

  useEffect(() => { if (canView) load(); }, [canView, load]);

  const total = rows.reduce((s, r) => s + r.totalReceived, 0);

  const columns: ReportTableColumn<MethodRow>[] = [
    { key: 'name', label: 'Método de pago', sortable: true },
    { key: 'transactionCount', label: 'Cantidad de transacciones', align: 'right', sortable: true },
    { key: 'totalReceived', label: 'Total recibido', align: 'right', sortable: true, render: (r) => formatLempiras(r.totalReceived) },
  ];

  const buildExportData = () => ({
    headers: ['Método de pago', 'Cantidad de transacciones', 'Total recibido'],
    rows: rows.map((r) => [r.name, r.transactionCount, r.totalReceived]),
  });

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <DateRangePresetFilter
          preset={preset} onPresetChange={setPreset}
          customFrom={customFrom} customTo={customTo}
          onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
        />
        <div className="max-w-xs">
          <label className="caption text-muted-foreground block mb-1">Empleado</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg p-5 shadow-warm border border-border max-w-xs">
        <p className="caption text-muted-foreground mb-1">Total recibido</p>
        <p className="text-2xl font-heading font-semibold text-foreground">{formatLempiras(total)}</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Detalle por método</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv(`metodos-pago_${from}_${to}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx(`metodos-pago_${from}_${to}.xlsx`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> Excel
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : (
          <ReportTable columns={columns} rows={rows} searchKeys={['name']} />
        )}
      </div>
    </div>
  );
};

export default PaymentMethodsReportInteractive;
