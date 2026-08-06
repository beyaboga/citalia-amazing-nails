'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface PeriodSummary {
  id: number;
  year: number;
  month: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at: string | null;
  closedByName: string | null;
  received: number;
  reserved: number;
  available: number;
}

interface PeriodDetail {
  period: { id: number; year: number; month: number; status: string };
  received: number;
  reserved: number;
  available: number;
  breakdown: { id: number; name: string; kind: string; balance: number }[];
}

interface PeriodsTabProps {
  canManage: boolean;
  onChanged: () => void;
}

const PeriodsTab = ({ canManage, onChanged }: PeriodsTabProps) => {
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PeriodDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reserve-funds/periods');
      if (!res.ok)
        throw new Error((await res.json())?.error || 'No se pudieron cargar los períodos');
      setPeriods(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDetail = async (id: number) => {
    setOpenId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/reserve-funds/periods/${id}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el resumen');
      setDetail(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeNow = async (id: number) => {
    if (!confirm('¿Cerrar este período ahora? Ya no admitirá aportes manuales.')) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/reserve-funds/periods/${id}/close`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cerrar el período');
      await load();
      if (openId === id) await openDetail(id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                  Período
                </th>
                <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                  Ventas
                </th>
                <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                  Fondos
                </th>
                <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                  Disponible
                </th>
                <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periods.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => openDetail(p.id)}
                >
                  <td className="px-4 py-3 font-medium text-primary">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'OPEN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                        Abierto
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Cerrado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {formatLempiras(p.received)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {formatLempiras(p.reserved)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                    {formatLempiras(p.available)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {canManage && p.status === 'OPEN' && (
                      <button
                        onClick={() => closeNow(p.id)}
                        disabled={closing}
                        className="h-9 px-3 rounded-lg text-sm font-medium text-warning hover:bg-warning/10 focus:outline-none focus:ring-2 focus:ring-warning disabled:opacity-50"
                      >
                        Cerrar ahora
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40"
          onClick={() => setOpenId(null)}
        >
          <div
            className="bg-card rounded-lg border border-border shadow-warm-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground">
                {detail
                  ? `Cierre — ${MONTH_NAMES[detail.period.month - 1]} ${detail.period.year}`
                  : 'Cargando…'}
              </h3>
              <button
                onClick={() => setOpenId(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Cerrar"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="p-8 flex items-center justify-center text-muted-foreground">
                <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="caption text-muted-foreground text-xs">Ventas</p>
                    <p className="font-heading font-semibold text-foreground">
                      {formatLempiras(detail.received)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="caption text-muted-foreground text-xs">Fondos</p>
                    <p className="font-heading font-semibold text-foreground">
                      {formatLempiras(detail.reserved)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="caption text-muted-foreground text-xs">Disponible</p>
                    <p className="font-heading font-semibold text-foreground">
                      {formatLempiras(detail.available)}
                    </p>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {detail.breakdown.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2 text-foreground">{f.name}</td>
                        <td className="py-2 text-right font-medium text-foreground">
                          {formatLempiras(f.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodsTab;
