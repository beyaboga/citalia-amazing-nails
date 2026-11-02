'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatDateDMY } from '@/lib/localDate';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';

interface NoShowRow {
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  noShows: number;
  completed: number;
  cancelled: number;
  noShowRate: number;
  lostAmount: number;
  lastNoShow: string | null;
}

interface Indicators {
  noShows: number;
  noShowRate: number;
  lostAmount: number;
  customersAffected: number;
  repeatCustomers: number;
}

const money = (n: number) => `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const IndicatorCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="bg-card rounded-lg p-5 shadow-warm border border-border">
    <div className="flex items-start justify-between mb-2">
      <p className="caption text-muted-foreground">{label}</p>
      <Icon name={icon as any} size={18} className="text-primary flex-shrink-0" />
    </div>
    <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
  </div>
);

const NoShowsReportInteractive = () => {
  const router = useRouter();
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('reports.view');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rows, setRows] = useState<NoShowRow[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { from, to } = useMemo(
    () => rangeForPreset(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo]
  );

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/no-shows?${new URLSearchParams({ from, to })}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      const data = await res.json();
      setRows(data.rows);
      setIndicators(data.indicators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  const columns: ReportTableColumn<NoShowRow>[] = [
    {
      key: 'customerName', label: 'Clienta', sortable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => router.push(`/customer-profile-details?id=${r.customerId}`)}
          className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          {r.customerName}
        </button>
      ),
    },
    {
      key: 'noShows', label: 'No asistió', align: 'right', sortable: true,
      render: (r) => (
        <span className={r.noShows >= 2 ? 'font-semibold text-error' : ''}>{r.noShows}</span>
      ),
    },
    { key: 'completed', label: 'Atendidas', align: 'right', sortable: true },
    { key: 'cancelled', label: 'Canceladas', align: 'right', sortable: true },
    { key: 'noShowRate', label: '% inasistencia', align: 'right', sortable: true, render: (r) => `${r.noShowRate}%` },
    { key: 'lostAmount', label: 'Dejado de ganar', align: 'right', sortable: true, render: (r) => money(r.lostAmount) },
    {
      key: 'lastNoShow', label: 'Última vez', sortable: true,
      render: (r) => (r.lastNoShow ? formatDateDMY(r.lastNoShow) : '—'),
    },
    { key: 'customerPhone', label: 'Teléfono', render: (r) => r.customerPhone ?? '—' },
  ];

  const buildExportData = () => ({
    headers: ['Clienta', 'No asistió', 'Atendidas', 'Canceladas', '% inasistencia', 'Dejado de ganar', 'Última vez', 'Teléfono'],
    rows: rows.map((r) => [
      r.customerName, r.noShows, r.completed, r.cancelled, r.noShowRate, r.lostAmount,
      r.lastNoShow ? formatDateDMY(r.lastNoShow) : '—', r.customerPhone ?? '—',
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
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <DateRangePresetFilter
          preset={preset} onPresetChange={setPreset}
          customFrom={customFrom} customTo={customTo}
          onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
        />
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {indicators && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <IndicatorCard label="Citas sin asistir" value={String(indicators.noShows)} icon="ExclamationTriangleIcon" />
          <IndicatorCard label="% de inasistencia" value={`${indicators.noShowRate}%`} icon="ChartBarIcon" />
          <IndicatorCard label="Dejado de ganar" value={money(indicators.lostAmount)} icon="BanknotesIcon" />
          <IndicatorCard
            label="Clientas con 2 o más"
            value={`${indicators.repeatCustomers} de ${indicators.customersAffected}`}
            icon="UserGroupIcon"
          />
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Clientas con inasistencias</h3>
            <p className="caption text-muted-foreground">
              El porcentaje se calcula sobre las citas atendidas más las que no asistieron; las
              canceladas con aviso no cuentan como inasistencia.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv(`inasistencias_${from}_${to}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx(`inasistencias_${from}_${to}.xlsx`, d.headers, d.rows); }}
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
          <ReportTable
            columns={columns}
            rows={rows}
            searchKeys={['customerName', 'customerPhone']}
            emptyMessage="No hubo inasistencias en este período."
          />
        )}
      </div>
    </div>
  );
};

export default NoShowsReportInteractive;
