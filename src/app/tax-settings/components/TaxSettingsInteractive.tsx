'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import type { TaxConfiguration } from '@/lib/payroll';

const TaxSettingsInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canManage = can('payroll.configure');

  const [taxes, setTaxes] = useState<TaxConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);

  // Formulario de alta
  const [newName, setNewName] = useState('');
  const [newPercentage, setNewPercentage] = useState('');
  const [newActive, setNewActive] = useState(false);

  // Edición en línea
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPercentage, setEditPercentage] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tax-configurations');
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudieron cargar los impuestos');
      setTaxes(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setError('');
    const percentage = Number(newPercentage);
    if (!newName.trim() || newName.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres');
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return setError('El porcentaje debe estar entre 0 y 100');

    setBusyId('new');
    try {
      const res = await fetch('/api/tax-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), percentage, isActive: newActive }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo guardar');
      setNewName('');
      setNewPercentage('');
      setNewActive(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setBusyId(null);
    }
  };

  const patch = async (id: number, payload: Record<string, unknown>) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/tax-configurations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo actualizar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (t: TaxConfiguration) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditPercentage(String(t.percentage));
  };

  const saveEdit = async (id: number) => {
    const percentage = Number(editPercentage);
    if (!editName.trim() || editName.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres');
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return setError('El porcentaje debe estar entre 0 y 100');
    await patch(id, { name: editName.trim(), percentage });
    setEditingId(null);
  };

  if (!sessionLoading && !canManage) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para configurar impuestos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {/* Alta */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Agregar impuesto</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="caption text-muted-foreground block mb-1">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ISV"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="caption text-muted-foreground block mb-1">Porcentaje</label>
            <div className="relative">
              <input
                type="number"
                value={newPercentage}
                onChange={(e) => setNewPercentage(e.target.value)}
                placeholder="15"
                min={0}
                max={100}
                step="0.01"
                className="w-full h-11 px-3 pr-7 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
          <label className="flex items-center gap-2 h-11 cursor-pointer select-none">
            <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm text-foreground">Activo</span>
          </label>
          <button
            onClick={handleCreate}
            disabled={busyId === 'new'}
            className="h-11 px-5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busyId === 'new' ? <Icon name="ArrowPathIcon" size={18} className="animate-spin" /> : <Icon name="PlusIcon" size={18} />}
            Agregar
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : taxes.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="ReceiptPercentIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Aún no hay impuestos configurados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Porcentaje</th>
                <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-smooth">
                  <td className="px-6 py-4">
                    {editingId === t.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-9 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{t.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === t.id ? (
                      <input
                        type="number"
                        value={editPercentage}
                        onChange={(e) => setEditPercentage(e.target.value)}
                        min={0}
                        max={100}
                        step="0.01"
                        className="w-24 h-9 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-foreground">{t.percentage}%</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {t.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                        <Icon name="CheckCircleIcon" size={14} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === t.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(t.id)}
                            disabled={busyId === t.id}
                            className="p-2 rounded-lg text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
                            aria-label="Guardar"
                          >
                            <Icon name="CheckIcon" size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Cancelar"
                          >
                            <Icon name="XMarkIcon" size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          {!t.isActive && (
                            <button
                              onClick={() => patch(t.id, { isActive: true })}
                              disabled={busyId === t.id}
                              className="px-3 h-9 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            >
                              Activar
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(t)}
                            className="p-2 rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Editar"
                          >
                            <Icon name="PencilIcon" size={18} />
                          </button>
                        </>
                      )}
                    </div>
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

export default TaxSettingsInteractive;
