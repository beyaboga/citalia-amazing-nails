'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';

interface Option {
  id: number;
  name: string;
}
interface MovementRow {
  id: number;
  date: string;
  fundName: string;
  movementType: string;
  direction: 'IN' | 'OUT';
  amount: number;
  concept: string;
  receiptNumber: string | null;
  customerName: string | null;
  employeeName: string | null;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  AUTO_SERVICE_COST: 'Costo automático',
  AUTO_COMMISSION: 'Comisión automática',
  AUTO_FIXED: 'Monto fijo automático',
  AUTO_PERCENTAGE: 'Porcentaje automático',
  COMMISSION_PAYOUT: 'Pago de comisión',
  MANUAL_CONTRIBUTION: 'Aporte manual',
  MANUAL_WITHDRAWAL: 'Retiro manual',
};

const ReserveFundsReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('funds.view');

  const [rows, setRows] = useState<MovementRow[]>([]);
  const [funds, setFunds] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [fundId, setFundId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [serviceId, setServiceId] = useState('');

  useEffect(() => {
    fetch('/api/reserve-funds/funds')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setFunds(rows.map((f) => ({ id: f.id, name: f.name }))))
      .catch(() => {});
    fetch('/api/team-members')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) =>
        setEmployees(
          rows.filter((m) => m.teamMemberId).map((m) => ({ id: m.teamMemberId, name: m.name }))
        )
      )
      .catch(() => {});
    fetch('/api/services')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setServices(rows.map((s) => ({ id: Number(s.id), name: s.name }))))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { from, to } = rangeForPreset(preset, { from: customFrom, to: customTo });
      const params = new URLSearchParams({ from, to });
      if (fundId) params.set('fundId', fundId);
      if (employeeId) params.set('employeeId', employeeId);
      if (serviceId) params.set('serviceId', serviceId);
      const res = await fetch(`/api/reports/reserve-funds?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [preset, customFrom, customTo, fundId, employeeId, serviceId]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  const columns: ReportTableColumn<MovementRow>[] = [
    { key: 'date', label: 'Fecha', sortable: true },
    { key: 'fundName', label: 'Fondo', sortable: true },
    {
      key: 'movementType',
      label: 'Tipo',
      render: (r) => MOVEMENT_TYPE_LABELS[r.movementType] ?? r.movementType,
    },
    { key: 'receiptNumber', label: 'Venta', render: (r) => r.receiptNumber ?? '—' },
    { key: 'customerName', label: 'Cliente', render: (r) => r.customerName ?? '—' },
    { key: 'employeeName', label: 'Empleado', render: (r) => r.employeeName ?? '—' },
    { key: 'concept', label: 'Concepto' },
    {
      key: 'in',
      label: 'Entrada',
      align: 'right',
      sortValue: (r) => (r.direction === 'IN' ? r.amount : 0),
      render: (r) => (r.direction === 'IN' ? formatLempiras(r.amount) : ''),
    },
    {
      key: 'out',
      label: 'Salida',
      align: 'right',
      sortValue: (r) => (r.direction === 'OUT' ? r.amount : 0),
      render: (r) => (r.direction === 'OUT' ? formatLempiras(r.amount) : ''),
    },
  ];

  const totalIn = rows.filter((r) => r.direction === 'IN').reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.direction === 'OUT').reduce((s, r) => s + r.amount, 0);

  const buildExportRows = () =>
    rows.map((r) => [
      r.date,
      r.fundName,
      MOVEMENT_TYPE_LABELS[r.movementType] ?? r.movementType,
      r.receiptNumber ?? '',
      r.customerName ?? '',
      r.employeeName ?? '',
      r.concept,
      r.direction === 'IN' ? r.amount : '',
      r.direction === 'OUT' ? r.amount : '',
    ]);
  const exportHeaders = [
    'Fecha',
    'Fondo',
    'Tipo',
    'Venta',
    'Cliente',
    'Empleado',
    'Concepto',
    'Entrada',
    'Salida',
  ];

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">
          No tiene permiso para ver reportes de Fondos Reservados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <DateRangePresetFilter
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() =>
                exportCsv(`reporte-fondos_${Date.now()}.csv`, exportHeaders, buildExportRows())
              }
              disabled={rows.length === 0}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name="ArrowDownTrayIcon" size={18} /> CSV
            </button>
            <button
              onClick={() =>
                exportXlsx(`reporte-fondos_${Date.now()}.xlsx`, exportHeaders, buildExportRows())
              }
              disabled={rows.length === 0}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name="ArrowDownTrayIcon" size={18} /> Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="caption text-muted-foreground block mb-1">Fondo</label>
            <select
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Empleado</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Servicio</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
          <p className="caption text-muted-foreground mb-1">Total entradas</p>
          <p className="text-2xl font-heading font-semibold text-success">
            {formatLempiras(totalIn)}
          </p>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
          <p className="caption text-muted-foreground mb-1">Total salidas</p>
          <p className="text-2xl font-heading font-semibold text-error">
            {formatLempiras(totalOut)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex items-center justify-center text-muted-foreground bg-card rounded-lg border border-border">
          <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-warm p-4">
          <ReportTable
            columns={columns}
            rows={rows}
            searchKeys={['fundName', 'concept', 'customerName', 'employeeName']}
          />
        </div>
      )}
    </div>
  );
};

export default ReserveFundsReportInteractive;
