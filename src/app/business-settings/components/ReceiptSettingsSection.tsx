'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import {
  formatReceiptNumber,
  type ReceiptSettings,
  type ReceiptNumbering,
} from '@/lib/payments';

const ReceiptSettingsSection = () => {
  const { can } = useSession();
  const canEdit = can('settings.manage');

  const [header, setHeader] = useState<ReceiptSettings | null>(null);
  const [numbering, setNumbering] = useState<ReceiptNumbering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingNumbering, setSavingNumbering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/receipt-settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/receipt-numbering').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([h, n]) => {
        setHeader(h);
        setNumbering(n);
      })
      .catch(() => setError('No se pudo cargar la configuración del recibo'))
      .finally(() => setIsLoading(false));
  }, []);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const saveHeader = async () => {
    if (!header) return;
    if (!header.businessName.trim()) return setError('El nombre del negocio es obligatorio');
    setSavingHeader(true);
    setError('');
    try {
      const response = await fetch('/api/receipt-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(header),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo guardar');
      flash('Encabezado guardado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSavingHeader(false);
    }
  };

  const saveNumbering = async () => {
    if (!numbering) return;
    setSavingNumbering(true);
    setError('');
    try {
      const response = await fetch('/api/receipt-numbering', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(numbering),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo guardar');
      flash('Numeración guardada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSavingNumbering(false);
    }
  };

  if (isLoading || !header || !numbering) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const nextNumber = formatReceiptNumber(numbering.prefix, numbering.nextSequence, numbering.padding);

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success" />
          <span className="text-sm text-success font-medium">{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {/* Encabezado del recibo */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Encabezado del recibo
            </h2>
            <p className="caption text-muted-foreground">
              Datos del negocio que aparecen en cada recibo.
            </p>
          </div>
          <Icon name="DocumentTextIcon" size={24} className="text-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Nombre del negocio</label>
            <input
              type="text"
              value={header.businessName}
              onChange={(e) => setHeader({ ...header, businessName: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Dirección</label>
            <input
              type="text"
              value={header.address ?? ''}
              onChange={(e) => setHeader({ ...header, address: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
            <input
              type="text"
              value={header.phone ?? ''}
              onChange={(e) => setHeader({ ...header, phone: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Logo <span className="caption text-xs text-muted-foreground">(URL, opcional)</span>
            </label>
            <input
              type="text"
              value={header.logoUrl ?? ''}
              onChange={(e) => setHeader({ ...header, logoUrl: e.target.value })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Mensaje inferior</label>
            <input
              type="text"
              value={header.footerMessage ?? ''}
              onChange={(e) => setHeader({ ...header, footerMessage: e.target.value })}
              disabled={!canEdit}
              placeholder="Ej: ¡Gracias por su preferencia!"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        {canEdit && (
          <div className="mt-4">
            <button
              type="button"
              onClick={saveHeader}
              disabled={savingHeader}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50"
            >
              {savingHeader ? 'Guardando...' : 'Guardar encabezado'}
            </button>
          </div>
        )}
      </div>

      {/* Numeración */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Numeración de recibos
            </h2>
            <p className="caption text-muted-foreground">
              El número aumenta automáticamente después de cada pago.
            </p>
          </div>
          <Icon name="HashtagIcon" size={24} className="text-primary" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prefijo</label>
            <input
              type="text"
              value={numbering.prefix}
              onChange={(e) => setNumbering({ ...numbering, prefix: e.target.value })}
              disabled={!canEdit}
              placeholder="FAC-"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Próximo número</label>
            <input
              type="number"
              min={1}
              value={numbering.nextSequence}
              onChange={(e) => setNumbering({ ...numbering, nextSequence: Math.max(1, Number(e.target.value) || 1) })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Dígitos <span className="caption text-xs text-muted-foreground">(ceros)</span>
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={numbering.padding}
              onChange={(e) => setNumbering({ ...numbering, padding: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/40 border border-border rounded-lg flex items-center gap-2">
          <span className="caption text-xs text-muted-foreground">El próximo recibo será</span>
          <span className="font-mono font-semibold text-foreground">{nextNumber}</span>
        </div>

        {canEdit && (
          <div className="mt-4">
            <button
              type="button"
              onClick={saveNumbering}
              disabled={savingNumbering}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50"
            >
              {savingNumbering ? 'Guardando...' : 'Guardar numeración'}
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <p className="caption text-muted-foreground">No tiene permiso para configurar el recibo.</p>
      )}
    </div>
  );
};

export default ReceiptSettingsSection;
