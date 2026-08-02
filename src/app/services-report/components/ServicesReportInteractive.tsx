'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';

interface ServiceRow {
  id: number;
  name: string;
  category: string;
  quantitySold: number;
  averagePrice: number;
  revenue: number;
  topEmployeeName: string | null;
}

interface Indicators {
  servicioMasSolicitado: { name: string; quantity: number } | null;
  servicioMasRentable: { name: string; revenue: number } | null;
  serviciosBajaDemanda: string[];
}

interface Option { id: number; name: string }

const IndicatorCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="bg-card rounded-lg p-5 shadow-warm border border-border">
    <div className="flex items-start justify-between mb-2">
      <p className="caption text-muted-foreground">{label}</p>
      <Icon name={icon as any} size={18} className="text-primary flex-shrink-0" />
    </div>
    <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
  </div>
);

const ServicesReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('reports.view');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [employees, setEmployees] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { from, to } = useMemo(() => rangeForPreset(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  useEffect(() => {
    fetch('/api/team-members').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setEmployees(rows.filter((m) => m.isBookable).map((m) => ({ id: m.teamMemberId, name: m.name })))
    ).catch(() => {});
    fetch('/api/service-categories').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setCategories(rows.map((c: any) => ({ id: c.id, name: c.name })))
    ).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (employeeId) params.set('employeeId', employeeId);
      if (categoryId) params.set('categoryId', categoryId);
      const res = await fetch(`/api/reports/services?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
      setIndicators(data.indicators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, employeeId, categoryId]);

  useEffect(() => { if (canView) load(); }, [canView, load]);

  const columns: ReportTableColumn<ServiceRow>[] = [
    { key: 'name', label: 'Servicio', sortable: true },
    { key: 'category', label: 'Categoría', sortable: true },
    { key: 'quantitySold', label: 'Cantidad vendida', align: 'right', sortable: true },
    { key: 'averagePrice', label: 'Precio promedio', align: 'right', sortable: true, render: (r) => formatLempiras(r.averagePrice) },
    { key: 'revenue', label: 'Ingresos generados', align: 'right', sortable: true, render: (r) => formatLempiras(r.revenue) },
    { key: 'topEmployeeName', label: 'Empleado que más lo realiza', render: (r) => r.topEmployeeName ?? '—' },
  ];

  const buildExportData = () => ({
    headers: ['Servicio', 'Categoría', 'Cantidad vendida', 'Precio promedio', 'Ingresos generados', 'Empleado que más lo realiza'],
    rows: rows.map((r) => [r.name, r.category, r.quantitySold, r.averagePrice, r.revenue, r.topEmployeeName ?? '—']),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="caption text-muted-foreground block mb-1">Empleado</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Categoría</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {indicators && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <IndicatorCard
            label="Servicio más solicitado"
            value={indicators.servicioMasSolicitado ? `${indicators.servicioMasSolicitado.name} (${indicators.servicioMasSolicitado.quantity})` : '—'}
            icon="SparklesIcon"
          />
          <IndicatorCard
            label="Servicio más rentable"
            value={indicators.servicioMasRentable ? `${indicators.servicioMasRentable.name} (${formatLempiras(indicators.servicioMasRentable.revenue)})` : '—'}
            icon="BanknotesIcon"
          />
          <IndicatorCard
            label="Servicios con baja demanda"
            value={indicators.serviciosBajaDemanda.length > 0 ? String(indicators.serviciosBajaDemanda.length) : '—'}
            icon="ArrowTrendingDownIcon"
          />
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Detalle por servicio</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv(`servicios_${from}_${to}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx(`servicios_${from}_${to}.xlsx`, d.headers, d.rows); }}
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
          <ReportTable columns={columns} rows={rows} searchKeys={['name', 'category', 'topEmployeeName']} />
        )}
      </div>
    </div>
  );
};

export default ServicesReportInteractive;
