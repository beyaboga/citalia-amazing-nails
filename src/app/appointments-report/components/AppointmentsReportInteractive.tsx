'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';
import { STATUS_CONFIG, type AppointmentStatus } from '@/app/appointments-calendar/components/calendarConstants';

interface AppointmentRow {
  appointmentId: number;
  date: string;
  time: string;
  customerName: string;
  serviceName: string;
  durationMinutes: number;
  employeeName: string | null;
  status: AppointmentStatus;
}

interface Indicators {
  total: number;
  completadas: number;
  canceladas: number;
  noAsistio: number;
  porcentajeCompletadas: number;
}

interface Option { id: number; name: string }

const STATUS_FILTER_OPTIONS: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

const IndicatorCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="bg-card rounded-lg p-5 shadow-warm border border-border">
    <div className="flex items-start justify-between mb-2">
      <p className="caption text-muted-foreground">{label}</p>
      <Icon name={icon as any} size={18} className="text-primary flex-shrink-0" />
    </div>
    <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
  </div>
);

const AppointmentsReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('reports.view');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');

  const [employees, setEmployees] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);

  const [rows, setRows] = useState<AppointmentRow[]>([]);
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
  }, []);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (employeeId) params.set('employeeId', employeeId);
      if (serviceId) params.set('serviceId', serviceId);
      if (categoryId) params.set('categoryId', categoryId);
      if (status) params.set('status', status);
      const res = await fetch(`/api/reports/appointments?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
      setIndicators(data.indicators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, employeeId, serviceId, categoryId, status]);

  useEffect(() => { if (canView) load(); }, [canView, load]);

  const columns: ReportTableColumn<AppointmentRow>[] = [
    { key: 'date', label: 'Fecha', sortable: true },
    { key: 'time', label: 'Hora', sortable: true },
    { key: 'customerName', label: 'Cliente', sortable: true },
    { key: 'serviceName', label: 'Servicio', sortable: true },
    { key: 'durationMinutes', label: 'Duración', align: 'right', sortable: true, render: (r) => `${r.durationMinutes} min` },
    { key: 'employeeName', label: 'Empleado', sortable: true, render: (r) => r.employeeName ?? '—' },
    {
      key: 'status', label: 'Estado', sortable: true,
      render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[r.status]?.chip ?? ''}`}>{STATUS_CONFIG[r.status]?.label ?? r.status}</span>,
    },
  ];

  const buildExportData = () => ({
    headers: ['Fecha', 'Hora', 'Cliente', 'Servicio', 'Duración (min)', 'Empleado', 'Estado'],
    rows: rows.map((r) => [
      r.date, r.time, r.customerName, r.serviceName, r.durationMinutes,
      r.employeeName ?? '—', STATUS_CONFIG[r.status]?.label ?? r.status,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="caption text-muted-foreground block mb-1">Estado de cita</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {STATUS_FILTER_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
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
          <IndicatorCard label="Total de citas" value={String(indicators.total)} icon="CalendarIcon" />
          <IndicatorCard label="Completadas" value={String(indicators.completadas)} icon="CheckCircleIcon" />
          <IndicatorCard label="Canceladas" value={String(indicators.canceladas)} icon="XCircleIcon" />
          <IndicatorCard label="No asistió" value={String(indicators.noAsistio)} icon="ExclamationTriangleIcon" />
          <IndicatorCard label="% completadas" value={`${indicators.porcentajeCompletadas}%`} icon="ChartBarIcon" />
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Detalle de citas</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv(`citas_${from}_${to}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx(`citas_${from}_${to}.xlsx`, d.headers, d.rows); }}
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
          <ReportTable columns={columns} rows={rows} searchKeys={['customerName', 'serviceName', 'employeeName']} />
        )}
      </div>
    </div>
  );
};

export default AppointmentsReportInteractive;
