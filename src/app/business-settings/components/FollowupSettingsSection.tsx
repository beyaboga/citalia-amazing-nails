'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';

interface FollowupSettings {
  upcomingWindowDays: number;
  lostMultiplier: number;
}

const FollowupSettingsSection = () => {
  const { can } = useSession();
  const canEdit = can('customers.manage');

  const [settings, setSettings] = useState<FollowupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/customer-followup/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then(setSettings)
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setIsLoading(false));
  }, []);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const save = async () => {
    if (!settings) return;
    setIsSaving(true);
    setError('');
    try {
      const res = await fetch('/api/customer-followup/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'No se pudo guardar');
      flash('Configuración guardada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-48 bg-card rounded-lg border border-border animate-pulse" />;
  }

  if (!canEdit) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <Icon name="LockClosedIcon" size={32} className="text-muted-foreground mx-auto mb-2" />
        <p className="caption text-muted-foreground">No tiene permiso para configurar el seguimiento de clientes.</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Seguimiento de Clientes</h3>
        <p className="caption text-xs text-muted-foreground">
          Define cuándo un cliente se marca "Próxima" a regresar y cuándo se considera "perdido".
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}
      {message && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={18} className="text-success flex-shrink-0" />
          <span className="text-sm text-success font-medium">{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div>
          <label className="caption text-xs text-muted-foreground block mb-1">
            Días antes para marcar "🟡 Próxima"
          </label>
          <input
            type="number"
            min={0}
            value={settings.upcomingWindowDays}
            onChange={(e) => setSettings({ ...settings, upcomingWindowDays: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="caption text-[11px] text-muted-foreground mt-1">Ej: 7 días antes de la fecha estimada.</p>
        </div>
        <div>
          <label className="caption text-xs text-muted-foreground block mb-1">
            Multiplicador para considerar "Perdido"
          </label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={settings.lostMultiplier}
            onChange={(e) => setSettings({ ...settings, lostMultiplier: Math.max(0.1, Number(e.target.value) || 1) })}
            className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="caption text-[11px] text-muted-foreground mt-1">
            Ej: 1 = se marca perdido cuando el atraso iguala su promedio habitual.
          </p>
        </div>
      </div>

      <button
        onClick={save}
        disabled={isSaving}
        className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 flex items-center gap-2"
      >
        {isSaving ? <Icon name="ArrowPathIcon" size={18} className="animate-spin" /> : <Icon name="CheckIcon" size={18} />}
        Guardar
      </button>
    </div>
  );
};

export default FollowupSettingsSection;
