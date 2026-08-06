'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';
import { useSession } from '@/lib/useSession';

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

interface DashboardData {
  period: { id: number; year: number; month: number };
  received: number;
  reserved: number;
  available: number;
  breakdown: { id: number; name: string; kind: string; displayOrder: number; balance: number }[];
}

interface RecalculateResult {
  movementsCreated: number;
  totalAdded: number;
  byFund: { fundId: number; fundName: string; count: number; total: number }[];
}

const PanelTab = () => {
  const { can } = useSession();
  const canManage = can('funds.manage');

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<RecalculateResult | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reserve-funds/dashboard');
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el panel');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError('');
    setRecalcResult(null);
    try {
      const res = await fetch('/api/reserve-funds/recalculate', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo recalcular');
      setRecalcResult(await res.json());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al recalcular');
    } finally {
      setRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center text-muted-foreground bg-card rounded-lg border border-border">
        <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
        <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
        <span className="text-sm text-error font-medium">{error || 'Sin datos'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="caption text-muted-foreground">
          Período actual: {MONTH_NAMES[data.period.month - 1]} {data.period.year} (acumulado del
          mes)
        </p>
        {canManage && (
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            title="Rellena reservas de pagos que ya existían antes de tener un fondo, sin duplicar ni volver a reservar comisiones ya pagadas"
            className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            <Icon name="ArrowPathIcon" size={16} className={recalculating ? 'animate-spin' : ''} />
            Recalcular Fondos
          </button>
        )}
      </div>

      {recalcResult && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm text-foreground space-y-1">
          {recalcResult.movementsCreated === 0 ? (
            <p className="font-medium">
              Todo estaba al día — no faltaba ninguna reserva por registrar.
            </p>
          ) : (
            <>
              <p className="font-medium">
                Se agregaron {recalcResult.movementsCreated} movimiento(s) por{' '}
                {formatLempiras(recalcResult.totalAdded)} en total.
              </p>
              <ul className="text-muted-foreground">
                {recalcResult.byFund.map((f) => (
                  <li key={f.fundId}>
                    {f.fundName}: {f.count} movimiento(s), {formatLempiras(f.total)}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                Las comisiones ya pagadas no se reservan de nuevo.
              </p>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="BanknotesIcon" size={18} className="text-success" />
            <p className="caption text-muted-foreground">Dinero recibido</p>
          </div>
          <p className="text-3xl font-heading font-semibold text-foreground">
            {formatLempiras(data.received)}
          </p>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-warm border border-warning/30 ring-1 ring-warning/10">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="LockClosedIcon" size={18} className="text-warning" />
            <p className="caption text-muted-foreground">Fondos reservados</p>
          </div>
          <p className="text-3xl font-heading font-semibold text-foreground">
            {formatLempiras(data.reserved)}
          </p>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-warm border border-primary/30 ring-1 ring-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="WalletIcon" size={18} className="text-primary" />
            <p className="caption text-muted-foreground">Disponible real</p>
          </div>
          <p
            className={`text-3xl font-heading font-semibold ${data.available >= 0 ? 'text-foreground' : 'text-error'}`}
          >
            {formatLempiras(data.available)}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-heading font-semibold text-lg text-foreground">Desglose por fondo</h3>
        </div>
        {data.breakdown.length === 0 ? (
          <p className="p-6 caption text-muted-foreground">Sin fondos configurados.</p>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-border">
              {data.breakdown.map((f) => (
                <tr key={f.id} className="hover:bg-muted/20">
                  <td className="px-6 py-3 text-foreground">{f.name}</td>
                  <td className="px-6 py-3 text-right font-medium text-foreground">
                    {formatLempiras(f.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PanelTab;
