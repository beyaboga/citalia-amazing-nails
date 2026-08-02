'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';
import { STATUS_CONFIG } from '@/app/appointments-calendar/components/calendarConstants';

interface EmployeeRow {
  teamMemberId: number;
  name: string;
  servicesCount: number;
  customersCount: number;
  revenue: number;
  commission: number;
  tips: number;
  ticketAverage: number;
}

interface Indicators {
  empleadaMayorVenta: { name: string; revenue: number } | null;
  empleadaMasServicios: { name: string; count: number } | null;
  promedioIngresosDiarios: number;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'completed', label: STATUS_CONFIG.completed.label },
  { value: 'all', label: 'Todos los estados' },
  { value: 'cancelled', label: STATUS_CONFIG.cancelled.label },
  { value: 'no_show', label: STATUS_CONFIG.no_show.label },
  { value: 'pending', label: STATUS_CONFIG.pending.label },
];

const IndicatorCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="bg-card rounded-lg p-5 shadow-warm border border-border">
    <div className="flex items-start justify-between mb-2">
      <p className="caption text-muted-foreground">{label}</p>
      <Icon name={icon as any} size={18} className="text-primary flex-shrink-0" />
    </div>
    <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
  </div>
);

const EmployeePerformanceReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('reports.view');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState('completed');

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { from, to } = useMemo(() => rangeForPreset(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to, status });
      const res = await fetch(`/api/reports/employee-performance?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
      setIndicators(data.indicators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, status]);

  useEffect(() => { if (canView) load(); }, [canView, load]);

  const columns: ReportTableColumn<EmployeeRow>[] = [
    { key: 'name', label: 'Empleada', sortable: true },
    { key: 'servicesCount', label: 'Servicios', align: 'right', sortable: true },
    { key: 'customersCount', label: 'Clientes atendidos', align: 'right', sortable: true },
    { key: 'revenue', label: 'Ingresos generados', align: 'right', sortable: true, render: (r) => formatLempiras(r.revenue) },
    { key: 'commission', label: 'Comisión generada', align: 'right', sortable: true, render: (r) => formatLempiras(r.commission) },
    { key: 'tips', label: 'Propinas recibidas', align: 'right', sortable: true, render: (r) => formatLempiras(r.tips) },
    { key: 'ticketAverage', label: 'Ticket promedio', align: 'right', sortable: true, render: (r) => formatLempiras(r.ticketAverage) },
  ];

  const buildExportData = () => ({
    headers: ['Empleada', 'Servicios', 'Clientes atendidos', 'Ingresos generados', 'Comisión generada', 'Propinas recibidas', 'Ticket promedio'],
    rows: rows.map((r) => [r.name, r.servicesCount, r.customersCount, r.revenue, r.commission, r.tips, r.ticketAverage]),
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
          <label className="caption text-muted-foreground block mb-1">Estado de cita</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {indicators && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <IndicatorCard
            label="Empleada con mayor venta"
            value={indicators.empleadaMayorVenta ? `${indicators.empleadaMayorVenta.name} (${formatLempiras(indicators.empleadaMayorVenta.revenue)})` : '—'}
            icon="TrophyIcon"
          />
          <IndicatorCard
            label="Empleada con más servicios"
            value={indicators.empleadaMasServicios ? `${indicators.empleadaMasServicios.name} (${indicators.empleadaMasServicios.count})` : '—'}
            icon="SparklesIcon"
          />
          <IndicatorCard label="Promedio de ingresos diarios" value={formatLempiras(indicators.promedioIngresosDiarios)} icon="ChartBarIcon" />
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Detalle por empleada</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv(`rendimiento_${from}_${to}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx(`rendimiento_${from}_${to}.xlsx`, d.headers, d.rows); }}
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

export default EmployeePerformanceReportInteractive;
