'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';
import FundFormModal, { type ReserveFund } from './FundFormModal';
import ManualMovementModal from './ManualMovementModal';

const KIND_LABELS: Record<ReserveFund['kind'], string> = {
  SERVICE_COST: 'Sistema · Costos',
  COMMISSION: 'Sistema · Comisiones',
  CUSTOM: 'Personalizado',
};

const RESERVATION_TYPE_LABELS: Record<ReserveFund['reservationType'], string> = {
  FIXED_AMOUNT: 'Monto fijo por venta',
  PERCENTAGE: 'Porcentaje de cada venta',
  SERVICE_COST: 'Basado en el costo del servicio',
  COMMISSION_BASED: 'Basado en las comisiones',
  MANUAL_ONLY: 'Solo aportes manuales',
};

interface FundsTabProps {
  canManage: boolean;
  canContribute: boolean;
  onChanged: () => void;
}

const FundsTab = ({ canManage, canContribute, onChanged }: FundsTabProps) => {
  const [funds, setFunds] = useState<ReserveFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReserveFund | null>(null);
  const [contributingTo, setContributingTo] = useState<ReserveFund | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reserve-funds/funds');
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudieron cargar los fondos');
      setFunds(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (fund: ReserveFund) => {
    setBusyId(fund.id);
    try {
      const res = await fetch(`/api/reserve-funds/funds/${fund.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !fund.isActive }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo actualizar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (fund: ReserveFund) => {
    if (!confirm(`¿Eliminar el fondo "${fund.name}"? Esta acción no se puede deshacer.`)) return;
    setBusyId(fund.id);
    try {
      const res = await fetch(`/api/reserve-funds/funds/${fund.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo eliminar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setBusyId(null);
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

      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="h-11 px-5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth flex items-center gap-2"
          >
            <Icon name="PlusIcon" size={18} /> Nuevo Fondo
          </button>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Fondo
                  </th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Reserva
                  </th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Saldo del mes
                  </th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {funds.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{f.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{KIND_LABELS[f.kind]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {RESERVATION_TYPE_LABELS[f.reservationType]}
                      {f.reservationValue != null && (
                        <span className="ml-1 text-foreground font-medium">
                          (
                          {f.reservationType === 'PERCENTAGE'
                            ? `${f.reservationValue}%`
                            : formatLempiras(f.reservationValue)}
                          )
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                      {formatLempiras(f.currentPeriodBalance)}
                    </td>
                    <td className="px-4 py-3">
                      {f.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                          <Icon name="CheckCircleIcon" size={14} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canContribute && (
                          <button
                            onClick={() => setContributingTo(f)}
                            className="p-2 rounded-lg text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Aporte manual"
                            title="Aporte manual"
                          >
                            <Icon name="PlusCircleIcon" size={18} />
                          </button>
                        )}
                        {canManage && !f.isSystem && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(f);
                                setShowForm(true);
                              }}
                              className="p-2 rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                              aria-label="Editar"
                              title="Editar"
                            >
                              <Icon name="PencilIcon" size={18} />
                            </button>
                            <button
                              onClick={() => toggleActive(f)}
                              disabled={busyId === f.id}
                              className="px-3 h-9 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            >
                              {f.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => remove(f)}
                              disabled={busyId === f.id}
                              className="p-2 rounded-lg text-error hover:bg-error/10 focus:outline-none focus:ring-2 focus:ring-error disabled:opacity-50"
                              aria-label="Eliminar"
                              title="Eliminar"
                            >
                              <Icon name="TrashIcon" size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <FundFormModal
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await load();
            onChanged();
          }}
        />
      )}

      {contributingTo && (
        <ManualMovementModal
          fundId={contributingTo.id}
          fundName={contributingTo.name}
          onClose={() => setContributingTo(null)}
          onSaved={async () => {
            setContributingTo(null);
            await load();
            onChanged();
          }}
        />
      )}
    </div>
  );
};

export default FundsTab;
