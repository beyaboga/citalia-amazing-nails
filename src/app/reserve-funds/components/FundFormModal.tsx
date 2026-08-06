'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface ReserveFund {
  id: number;
  name: string;
  kind: 'SERVICE_COST' | 'COMMISSION' | 'CUSTOM';
  reservationType:
    | 'FIXED_AMOUNT'
    | 'PERCENTAGE'
    | 'SERVICE_COST'
    | 'COMMISSION_BASED'
    | 'MANUAL_ONLY';
  reservationValue: number | null;
  isSystem: boolean;
  isActive: boolean;
  displayOrder: number;
  currentPeriodBalance: number;
}

const RESERVATION_TYPE_LABELS: Record<ReserveFund['reservationType'], string> = {
  FIXED_AMOUNT: 'Monto fijo por venta',
  PERCENTAGE: 'Porcentaje de cada venta',
  SERVICE_COST: 'Basado en el costo del servicio',
  COMMISSION_BASED: 'Basado en las comisiones',
  MANUAL_ONLY: 'Solo aportes manuales',
};

interface FundFormModalProps {
  editing: ReserveFund | null;
  onClose: () => void;
  onSaved: () => void;
}

const FundFormModal = ({ editing, onClose, onSaved }: FundFormModalProps) => {
  const [name, setName] = useState(editing?.name ?? '');
  const [reservationType, setReservationType] = useState<ReserveFund['reservationType']>(
    editing?.reservationType ?? 'FIXED_AMOUNT'
  );
  const [reservationValue, setReservationValue] = useState(
    editing?.reservationValue != null ? String(editing.reservationValue) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(editing);
  const needsValue = reservationType === 'FIXED_AMOUNT' || reservationType === 'PERCENTAGE';

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || name.trim().length < 2)
      return setError('El nombre debe tener al menos 2 caracteres');
    if (needsValue && !(Number(reservationValue) >= 0)) return setError('Ingrese un valor válido');
    if (reservationType === 'PERCENTAGE' && Number(reservationValue) > 100)
      return setError('El porcentaje no puede ser mayor a 100');

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: name.trim(), reservationType };
      if (needsValue) payload.reservationValue = Number(reservationValue);

      const res = await fetch(
        isEdit ? `/api/reserve-funds/funds/${editing!.id}` : '/api/reserve-funds/funds',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo guardar el fondo');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg text-foreground">
            {isEdit ? 'Editar Fondo' : 'Nuevo Fondo Personalizado'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Cerrar"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="caption text-muted-foreground block mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Alquiler"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="caption text-muted-foreground block mb-1">Tipo de reserva</label>
            <select
              value={reservationType}
              onChange={(e) => setReservationType(e.target.value as ReserveFund['reservationType'])}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(RESERVATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {needsValue && (
            <div>
              <label className="caption text-muted-foreground block mb-1">
                {reservationType === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto fijo (L)'}
              </label>
              <input
                type="text"
                value={reservationValue}
                onChange={(e) => setReservationValue(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-smooth"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
            ) : (
              <Icon name="CheckIcon" size={18} />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FundFormModal;
