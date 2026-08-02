'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';
import ReportTable, { type ReportTableColumn } from '@/components/common/ReportTable';
import {
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_STATUS_EMOJI,
  FOLLOWUP_STATUS_CLASSES,
  followupStatusMessage,
  type FollowupRow,
  type FollowupStatus,
} from '@/lib/customerFollowup';

interface CategoryOption {
  id: number;
  name: string;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'TODAY', label: 'Deben regresar hoy' },
  { value: 'UPCOMING', label: '🟡 Próximas' },
  { value: 'OVERDUE', label: '🔴 Vencidas' },
  { value: 'LOST', label: 'Perdidos' },
  { value: 'ON_TIME', label: '🟢 A tiempo' },
  { value: 'INSUFFICIENT_DATA', label: '⚪ Sin historial' },
];

const CustomerFollowupInteractive = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('customers.manage');

  const [rows, setRows] = useState<FollowupRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [categoryId, setCategoryId] = useState('');

  // Filtro de fecha (última visita) — opcional, apagado por defecto para no
  // cambiar el comportamiento actual (ver a quién hay que contactar, sin importar
  // cuándo fue su última visita).
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const { from, to } = useMemo(() => rangeForPreset(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (categoryId) params.set('categoryId', categoryId);
      if (dateFilterEnabled && from) params.set('from', from);
      if (dateFilterEnabled && to) params.set('to', to);
      const res = await fetch(`/api/customer-followup?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el seguimiento');
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [status, categoryId, dateFilterEnabled, from, to]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  // Los triggers mantienen esto al día hacia adelante; este botón recalcula TODO
  // el historial de una vez (útil tras registrar citas de meses anteriores).
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/customer-followup/recalculate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar');
      setMessage(`Actualizado: ${data.customersProcessed} cliente${data.customersProcessed === 1 ? '' : 's'} recalculado${data.customersProcessed === 1 ? '' : 's'}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    fetch('/api/service-categories')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CategoryOption[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const sendWhatsApp = (row: FollowupRow) => {
    const message = `Hola ${row.customerName.split(' ')[0]}, ¡esperamos que estés muy bien! Notamos que ya te toca tu próxima visita de ${row.categoryName}. ¿Te gustaría agendar tu cita?`;
    const url = buildWhatsAppUrl(row.customerPhone, message);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else alert('Esta clienta no tiene un teléfono válido registrado.');
  };

  const columns: ReportTableColumn<FollowupRow>[] = [
    {
      key: 'customerName', label: 'Cliente', sortable: true,
      render: (row) => (
        <button
          onClick={() => router.push(`/customer-profile-details?id=${row.customerId}`)}
          className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          {row.customerName}
        </button>
      ),
    },
    { key: 'categoryName', label: 'Categoría', sortable: true },
    { key: 'lastVisitDate', label: 'Última visita', sortable: true, render: (row) => row.lastVisitDate ?? '—' },
    {
      key: 'averageDays', label: 'Promedio', sortable: true,
      render: (row) => (row.averageDays !== null ? `${Math.round(row.averageDays)} días` : '—'),
    },
    { key: 'estimatedNextVisit', label: 'Próxima fecha', sortable: true, render: (row) => row.estimatedNextVisit ?? '—' },
    {
      key: 'status', label: 'Estado', sortable: true, sortValue: (row) => FOLLOWUP_STATUS_LABELS[row.status as FollowupStatus],
      render: (row) => {
        const st = row.status as FollowupStatus;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${FOLLOWUP_STATUS_CLASSES[st]}`}
            title={followupStatusMessage(st, row.daysLate)}
          >
            {FOLLOWUP_STATUS_EMOJI[st]} {FOLLOWUP_STATUS_LABELS[st]}
          </span>
        );
      },
    },
    {
      key: 'actions', label: 'Acciones', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => router.push(`/new-appointment-creation?customerId=${row.customerId}`)}
            className="p-2 rounded-lg text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Agendar cita" aria-label="Agendar cita"
          >
            <Icon name="CalendarIcon" size={16} />
          </button>
          <button
            onClick={() => sendWhatsApp(row)}
            className="p-2 rounded-lg text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success"
            title="Enviar WhatsApp" aria-label="Enviar WhatsApp"
          >
            <Icon name="ChatBubbleLeftRightIcon" size={16} />
          </button>
          <button
            onClick={() => router.push(`/customer-profile-details?id=${row.customerId}`)}
            className="p-2 rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            title="Ver historial" aria-label="Ver historial"
          >
            <Icon name="ClockIcon" size={16} />
          </button>
        </div>
      ),
    },
  ];

  const buildExportData = () => ({
    headers: ['Cliente', 'Categoría', 'Última visita', 'Promedio (días)', 'Próxima fecha', 'Estado'],
    rows: rows.map((row) => [
      row.customerName, row.categoryName, row.lastVisitDate ?? '—',
      row.averageDays !== null ? Math.round(row.averageDays) : '—',
      row.estimatedNextVisit ?? '—', FOLLOWUP_STATUS_LABELS[row.status as FollowupStatus],
    ]),
  });

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver el seguimiento de clientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="caption text-xs text-muted-foreground">
            Se recalcula solo al completar o pagar una cita. Usa "Actualizar" para reflejar cambios de inmediato.
          </p>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="h-10 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            <Icon name="ArrowPathIcon" size={16} className={isRecalculating ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="caption text-muted-foreground block mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={dateFilterEnabled} onChange={(e) => setDateFilterEnabled(e.target.checked)} className="rounded border-border" />
          Filtrar por fecha de última visita
        </label>
        {dateFilterEnabled && (
          <DateRangePresetFilter
            preset={preset} onPresetChange={setPreset}
            customFrom={customFrom} customTo={customTo}
            onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
          />
        )}
      </div>

      {message && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0" />
          <span className="text-sm text-success font-medium">{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-heading font-semibold text-foreground">Clientes en seguimiento</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const d = buildExportData(); exportCsv('retencion-clientes.csv', d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-9 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Icon name="ArrowDownTrayIcon" size={16} /> CSV
            </button>
            <button type="button" onClick={() => { const d = buildExportData(); exportXlsx('retencion-clientes.xlsx', d.headers, d.rows); }}
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
          <ReportTable columns={columns} rows={rows} searchKeys={['customerName', 'categoryName']} />
        )}
      </div>
    </div>
  );
};

export default CustomerFollowupInteractive;
