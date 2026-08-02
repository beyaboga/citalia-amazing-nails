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

interface SaleRow {
  paymentId: number;
  date: string;
  appointmentId: number;
  customerName: string;
  employeeName: string | null;
  services: string | null;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  tipAmount: number;
  paymentMethods: string | null;
  totalReceived: number;
  status: string;
}

interface Indicators {
  ventasTotales: number;
  promedioPorCliente: number;
  cantidadCitas: number;
  servicioMasVendido: string | null;
  diaMayoresIngresos: { date: string; total: number } | null;
}

interface Option { id: number; name: string }

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

const SalesReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('reports.view');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [status, setStatus] = useState('completed');

  const [employees, setEmployees] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [methods, setMethods] = useState<Option[]>([]);

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { from, to } = useMemo(() => rangeForPreset(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  useEffect(() => {
    fetch('/api/team-members').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setEmployees(rows.filter((m) => m.isBookable).map((m) => ({ id: m.teamMemberId, name: m.name })))
    ).catch(() => {});
    fetch('/api/services').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setServices(rows.map((s: any) => ({ id: s.id, name: s.name })))
    ).catch(() => {});
    fetch('/api/service-categories').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setCategories(rows.map((c: any) => ({ id: c.id, name: c.name })))
    ).catch(() => {});
    fetch('/api/payment-methods').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setMethods(rows.filter((m: any) => m.type !== 'SPLIT_PAYMENT').map((m: any) => ({ id: m.id, name: m.name })))
    ).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to, status });
      if (employeeId) params.set('employeeId', employeeId);
      if (serviceId) params.set('serviceId', serviceId);
      if (categoryId) params.set('categoryId', categoryId);
      if (methodId) params.set('methodId', methodId);
      const res = await fetch(`/api/reports/sales?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
      setIndicators(data.indicators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, employeeId, serviceId, categoryId, methodId, status]);

  useEffect(() => { if (canView) load(); }, [canView, load]);

  const columns: ReportTableColumn<SaleRow>[] = [
    { key: 'date', label: 'Fecha', sortable: true },
    { key: 'appointmentId', label: 'Cita', sortable: true },
    { key: 'customerName', label: 'Cliente', sortable: true },
    { key: 'employeeName', label: 'Empleado', sortable: true, render: (r) => r.employeeName ?? '—' },
    { key: 'services', label: 'Servicios', render: (r) => r.services ?? '—' },
    { key: 'originalPrice', label: 'Precio original', align: 'right', sortable: true, render: (r) => formatLempiras(r.originalPrice) },
    { key: 'discountAmount', label: 'Descuento', align: 'right', sortable: true, render: (r) => formatLempiras(r.discountAmount) },
    { key: 'finalPrice', label: 'Precio final', align: 'right', sortable: true, render: (r) => formatLempiras(r.finalPrice) },
    { key: 'tipAmount', label: 'Propina', align: 'right', sortable: true, render: (r) => formatLempiras(r.tipAmount) },
    { key: 'paymentMethods', label: 'Método de pago', render: (r) => r.paymentMethods ?? '—' },
    { key: 'totalReceived', label: 'Total recibido', align: 'right', sortable: true, render: (r) => formatLempiras(r.totalReceived) },
  ];

  const buildExportData = () => ({
    headers: columns.map((c) => c.label),
    rows: rows.map((r) => [
      r.date, r.appointmentId, r.customerName, r.employeeName ?? '—', r.services ?? '—',
      r.originalPrice, r.discountAmount, r.finalPrice, r.tipAmount, r.paymentMethods ?? '—', r.totalReceived,
    ]),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="caption text-muted-foreground block mb-1">Empleado</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Servicio</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
          <div>
            <label className="caption text-muted-foreground block mb-1">Método de pago</label>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Estado de cita</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <IndicatorCard label="Ventas totales" value={formatLempiras(indicators.ventasTotales)} icon="BanknotesIcon" />
          <IndicatorCard label="Promedio por cliente" value={formatLempiras(indicators.promedioPorCliente)} icon="UserIcon" />
          <IndicatorCard label="Citas realizadas" value={String(indicators.cantidadCitas)} icon="CalendarIcon" />
          <IndicatorCard label="Servicio más vendido" value={indicators.servicioMasVendido ?? '—'} icon="SparklesIcon" />
          <IndicatorCard
            label="Día con mayores ingresos"
            value={indicators.diaMayoresIngresos ? `${indicators.diaMayoresIngresos.date} (${formatLempiras(indicators.diaMayoresIngresos.total)})` : '—'}
            icon="ChartBarIcon"
          />
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Detalle de ventas</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv(`ventas_${from}_${to}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx(`ventas_${from}_${to}.xlsx`, d.headers, d.rows); }}
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
          <ReportTable columns={columns} rows={rows} searchKeys={['customerName', 'employeeName', 'services']} />
        )}
      </div>
    </div>
  );
};

export default SalesReportInteractive;
