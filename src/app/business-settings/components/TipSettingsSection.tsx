'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { TIP_TYPE_LABELS, formatTipOption, type TipSetting, type TipType } from '@/lib/payments';

interface Draft {
  id: number | null;
  type: TipType;
  value: number | '';
  isActive: boolean;
}

const EMPTY: Draft = { id: null, type: 'PERCENTAGE', value: '', isActive: true };

const TipSettingsSection = () => {
  const { can } = useSession();
  const canEdit = can('settings.manage');

  const [tips, setTips] = useState<TipSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('/api/tip-settings')
      .then((res) => (res.ok ? res.json() : []))
      .then(setTips)
      .catch(() => setError('No se pudieron cargar las propinas'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    if (!draft) return;
    if (draft.value === '' || Number(draft.value) < 0) return setError('Indique un valor válido');

    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(
        draft.id ? `/api/tip-settings/${draft.id}` : '/api/tip-settings',
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: draft.type, value: Number(draft.value), isActive: draft.isActive }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo guardar');

      setDraft(null);
      setMessage('Opción guardada');
      setTimeout(() => setMessage(''), 3000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (tip: TipSetting) => {
    try {
      const response = await fetch(`/api/tip-settings/${tip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tip.type, value: tip.value, isActive: !tip.isActive }),
      });
      if (!response.ok) throw new Error();
      load();
    } catch {
      setError('No se pudo actualizar la opción');
    }
  };

  const handleDelete = async (tip: TipSetting) => {
    if (!confirm(`¿Eliminar la opción ${formatTipOption(tip.type, tip.value)}?`)) return;
    try {
      const response = await fetch(`/api/tip-settings/${tip.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      load();
    } catch {
      setError('No se pudo eliminar la opción');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-14 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Propinas</h2>
          <p className="caption text-muted-foreground">
            Opciones que se ofrecen al cobrar. La opción &quot;Personalizada&quot; siempre está
            disponible, aunque no aparezca aquí.
          </p>
        </div>
        <Icon name="SparklesIcon" size={24} className="text-primary" />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
              tip.isActive ? 'border-border bg-background' : 'border-border bg-muted/40 opacity-60'
            }`}
          >
            <span className="font-medium text-foreground tabular-nums">
              {formatTipOption(tip.type, tip.value)}
            </span>
            <span className="caption text-xs text-muted-foreground">{TIP_TYPE_LABELS[tip.type]}</span>
            {canEdit && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => toggleActive(tip)}
                  className="p-1 text-muted-foreground hover:text-primary transition-smooth"
                  title={tip.isActive ? 'Desactivar' : 'Activar'}
                >
                  <Icon name={tip.isActive ? 'EyeIcon' : 'EyeSlashIcon'} size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ id: tip.id, type: tip.type, value: tip.value, isActive: tip.isActive })}
                  className="p-1 text-muted-foreground hover:text-primary transition-smooth"
                  title="Editar"
                >
                  <Icon name="PencilSquareIcon" size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tip)}
                  className="p-1 text-muted-foreground hover:text-error transition-smooth"
                  title="Eliminar"
                >
                  <Icon name="TrashIcon" size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
        {tips.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay opciones configuradas.</p>
        )}
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

      {draft && canEdit && (
        <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4 mb-4">
          <h3 className="font-medium text-foreground">{draft.id ? 'Editar opción' : 'Nueva opción'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as TipType })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PERCENTAGE">Porcentaje</option>
                <option value="FIXED">Valor fijo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {draft.type === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Valor (L)'}
              </label>
              <input
                type="number"
                min={0}
                max={draft.type === 'PERCENTAGE' ? 100 : undefined}
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
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
          onClick={() => {
            setError('');
            setDraft({ ...EMPTY });
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
        >
          <Icon name="PlusIcon" size={18} />
          Agregar opción
        </button>
      )}

      {!canEdit && (
        <p className="caption text-muted-foreground">No tiene permiso para configurar propinas.</p>
      )}
    </div>
  );
};

export default TipSettingsSection;
