'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import {
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHOD_TYPE_LABELS,
  type PaymentMethod,
  type PaymentMethodType,
} from '@/lib/payments';

interface Draft {
  id: number | null;
  name: string;
  type: PaymentMethodType;
  bank: string;
  account: string;
  isActive: boolean;
  isDefault: boolean;
}

const EMPTY: Draft = {
  id: null,
  name: '',
  type: 'CASH',
  bank: '',
  account: '',
  isActive: true,
  isDefault: false,
};

const PaymentMethodsSection = () => {
  const { can } = useSession();
  const canEdit = can('settings.manage');

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('/api/payment-methods')
      .then((res) => (res.ok ? res.json() : []))
      .then(setMethods)
      .catch(() => setError('No se pudieron cargar los métodos'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const startCreate = () => {
    setError('');
    setDraft({ ...EMPTY });
  };

  const startEdit = (method: PaymentMethod) => {
    setError('');
    setDraft({
      id: method.id,
      name: method.name,
      type: method.type as PaymentMethodType,
      bank: method.bank ?? '',
      account: method.account ?? '',
      isActive: method.isActive,
      isDefault: method.isDefault,
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return setError('El nombre es obligatorio');

    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(
        draft.id ? `/api/payment-methods/${draft.id}` : '/api/payment-methods',
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo guardar');

      setDraft(null);
      setMessage(draft.id ? 'Método actualizado' : 'Método creado');
      setTimeout(() => setMessage(''), 3000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (!confirm(`¿Eliminar el método "${method.name}"?`)) return;
    setError('');
    try {
      const response = await fetch(`/api/payment-methods/${method.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo eliminar');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Métodos de pago</h2>
          <p className="caption text-muted-foreground">
            Configure las formas de pago disponibles al cobrar una cita.
          </p>
        </div>
        <Icon name="BanknotesIcon" size={24} className="text-primary" />
      </div>

      <div className="space-y-2 mb-6">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center gap-3 p-4 border border-border rounded-lg bg-background"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{method.name}</span>
                {method.isDefault && (
                  <span className="caption text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Predeterminado
                  </span>
                )}
                {method.isSystem && (
                  <span className="caption text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Fijo
                  </span>
                )}
                {!method.isActive && (
                  <span className="caption text-xs px-2 py-0.5 rounded-full bg-error/10 text-error">
                    Inactivo
                  </span>
                )}
              </div>
              <p className="caption text-xs text-muted-foreground">
                {PAYMENT_METHOD_TYPE_LABELS[method.type]}
                {method.bank ? ` · ${method.bank}` : ''}
                {method.account ? ` · ${method.account}` : ''}
              </p>
            </div>

            {canEdit && !method.isSystem && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(method)}
                  className="p-2 text-muted-foreground hover:text-primary transition-smooth"
                  aria-label={`Editar ${method.name}`}
                >
                  <Icon name="PencilSquareIcon" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(method)}
                  className="p-2 text-muted-foreground hover:text-error transition-smooth"
                  aria-label={`Eliminar ${method.name}`}
                >
                  <Icon name="TrashIcon" size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success" />
          <span className="text-sm text-success font-medium">{message}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {/* Formulario de alta/edición */}
      {draft && canEdit && (
        <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4 mb-4">
          <h3 className="font-medium text-foreground">
            {draft.id ? 'Editar método' : 'Nuevo método'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ej: Transferencia BAC"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as PaymentMethodType })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PAYMENT_METHOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PAYMENT_METHOD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Banco <span className="caption text-xs text-muted-foreground">(opcional)</span>
              </label>
              <input
                type="text"
                value={draft.bank}
                onChange={(e) => setDraft({ ...draft, bank: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Cuenta <span className="caption text-xs text-muted-foreground">(opcional)</span>
              </label>
              <input
                type="text"
                value={draft.account}
                onChange={(e) => setDraft({ ...draft, account: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
              />
              Predeterminado
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-5 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {canEdit && !draft && (
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
        >
          <Icon name="PlusIcon" size={18} />
          Agregar método
        </button>
      )}

      {!canEdit && (
        <p className="caption text-muted-foreground">
          No tiene permiso para configurar métodos de pago.
        </p>
      )}
    </div>
  );
};

export default PaymentMethodsSection;
