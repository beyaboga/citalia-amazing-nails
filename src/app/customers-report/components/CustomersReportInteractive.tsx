'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';
import type { CustomerSegment } from '@/lib/customerSegments';

interface CustomerRow {
  id: number;
  name: string;
  registrationDate: string;
  firstVisit: string | null;
  lastVisit: string | null;
  visitCount: number;
  totalSpent: number;
  favoriteService: string | null;
  favoriteEmployeeName: string | null;
  ticketAverage: number;
  segment: CustomerSegment;
}

interface Indicators {
  nuevas: number;
  frecuentes: number;
  vip: number;
  inactivas: number;
}

const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  NUEVA: 'Nueva',
  FRECUENTE: 'Frecuente',
  VIP: 'VIP',
  INACTIVA: 'Inactiva',
  REGULAR: 'Regular',
};

const SEGMENT_CHIPS: Record<CustomerSegment, string> = {
  NUEVA: 'bg-primary/10 text-primary border-primary/30',
  FRECUENTE: 'bg-accent/20 text-accent-foreground border-accent/40',
  VIP: 'bg-warning/10 text-warning border-warning/30',
  INACTIVA: 'bg-error/10 text-error border-error/30',
  REGULAR: 'bg-muted text-muted-foreground border-border',
};

const SEGMENT_FILTER_OPTIONS: CustomerSegment[] = ['NUEVA', 'FRECUENTE', 'VIP', 'INACTIVA', 'REGULAR'];

const IndicatorCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="bg-card rounded-lg p-5 shadow-warm border border-border">
    <div className="flex items-start justify-between mb-2">
      <p className="caption text-muted-foreground">{label}</p>
      <Icon name={icon as any} size={18} className="text-primary flex-shrink-0" />
    </div>
    <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
  </div>
);

const CustomersReportInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('customers.manage');

  const [segment, setSegment] = useState('');
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (segment) params.set('segment', segment);
      const res = await fetch(`/api/reports/customers?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
      setIndicators(data.indicators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [segment]);

  useEffect(() => { if (canView) load(); }, [canView, load]);

  const columns: ReportTableColumn<CustomerRow>[] = [
    { key: 'name', label: 'Cliente', sortable: true },
    { key: 'firstVisit', label: 'Primera visita', sortable: true, render: (r) => r.firstVisit ?? '—' },
    { key: 'lastVisit', label: 'Última visita', sortable: true, render: (r) => r.lastVisit ?? '—' },
    { key: 'visitCount', label: 'Visitas', align: 'right', sortable: true },
    { key: 'totalSpent', label: 'Total gastado', align: 'right', sortable: true, render: (r) => formatLempiras(r.totalSpent) },
    { key: 'favoriteService', label: 'Servicio favorito', render: (r) => r.favoriteService ?? '—' },
    { key: 'favoriteEmployeeName', label: 'Empleado favorito', render: (r) => r.favoriteEmployeeName ?? '—' },
    { key: 'ticketAverage', label: 'Ticket promedio', align: 'right', sortable: true, render: (r) => formatLempiras(r.ticketAverage) },
    {
      key: 'segment', label: 'Segmento', sortable: true, sortValue: (r) => SEGMENT_LABELS[r.segment],
      render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEGMENT_CHIPS[r.segment]}`}>{SEGMENT_LABELS[r.segment]}</span>,
    },
  ];

  const buildExportData = () => ({
    headers: ['Cliente', 'Primera visita', 'Última visita', 'Visitas', 'Total gastado', 'Servicio favorito', 'Empleado favorito', 'Ticket promedio', 'Segmento'],
    rows: rows.map((r) => [
      r.name, r.firstVisit ?? '—', r.lastVisit ?? '—', r.visitCount, r.totalSpent,
      r.favoriteService ?? '—', r.favoriteEmployeeName ?? '—', r.ticketAverage, SEGMENT_LABELS[r.segment],
    ]),
  });

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver reportes de clientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="max-w-xs">
          <label className="caption text-muted-foreground block mb-1">Segmento</label>
          <select value={segment} onChange={(e) => setSegment(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos</option>
            {SEGMENT_FILTER_OPTIONS.map((s) => <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <IndicatorCard label="Nuevas" value={String(indicators.nuevas)} icon="SparklesIcon" />
          <IndicatorCard label="Frecuentes" value={String(indicators.frecuentes)} icon="ArrowPathIcon" />
          <IndicatorCard label="VIP" value={String(indicators.vip)} icon="StarIcon" />
          <IndicatorCard label="Inactivas" value={String(indicators.inactivas)} icon="ExclamationTriangleIcon" />
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Detalle por cliente</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv('clientes.csv', d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx('clientes.xlsx', d.headers, d.rows); }}
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
          <ReportTable columns={columns} rows={rows} searchKeys={['name', 'favoriteService', 'favoriteEmployeeName']} />
        )}
      </div>
    </div>
  );
};

export default CustomersReportInteractive;
