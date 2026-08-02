'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface PriceChangeReason {
  id: number;
  name: string;
}

interface ReasonSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Muestra el botón "+" para agregar un motivo nuevo al catálogo. */
  canManage?: boolean;
  id?: string;
  className?: string;
}

/**
 * Selector de motivo de cambio de precio, alimentado por el catálogo. Con permiso,
 * un botón "+" permite agregar una opción nueva sin salir de la pantalla; el motivo
 * creado queda disponible en todo el sistema y seleccionado de inmediato.
 */
const ReasonSelect = ({ value, onChange, canManage = false, id, className = '' }: ReasonSelectProps) => {
  const [reasons, setReasons] = useState<PriceChangeReason[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadReasons = useCallback(async () => {
    try {
      const response = await fetch('/api/price-change-reasons');
      if (response.ok) setReasons(await response.json());
    } catch {
      // El select simplemente queda con las opciones que ya tenga.
    }
  }, []);

  useEffect(() => {
    loadReasons();
  }, [loadReasons]);

  const handleAdd = async () => {
    const name = newReason.trim();
    if (name.length < 2) {
      setError('El motivo debe tener al menos 2 caracteres');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/price-change-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al guardar el motivo');
      await loadReasons();
      onChange(result.name); // Queda seleccionado el motivo recién creado.
      setNewReason('');
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el motivo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 min-w-0 px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
        >
          <option value="">Seleccione un motivo</option>
          {reasons.map((reason) => (
            <option key={reason.id} value={reason.name}>
              {reason.name}
            </option>
          ))}
          {/* Conserva el valor actual aunque ya no esté en el catálogo (motivo histórico). */}
          {value && !reasons.some((reason) => reason.name === value) && (
            <option value={value}>{value}</option>
          )}
        </select>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setIsAdding((prev) => !prev);
              setError('');
            }}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-border text-primary hover:bg-primary/10 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Agregar motivo"
            title="Agregar motivo nuevo"
          >
            <Icon name={isAdding ? 'XMarkIcon' : 'PlusIcon'} size={18} />
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mt-2 p-2 rounded-lg border border-border bg-muted/40 space-y-2">
          <input
            type="text"
            value={newReason}
            onChange={(event) => {
              setNewReason(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Nuevo motivo"
            autoFocus
            className="w-full px-3 h-9 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && (
            <p className="text-xs text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={13} />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewReason('');
                setError('');
              }}
              className="h-8 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReasonSelect;
