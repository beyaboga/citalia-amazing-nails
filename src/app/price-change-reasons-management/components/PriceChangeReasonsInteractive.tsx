'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Reason {
  id: number;
  name: string;
  isActive: boolean;
  usageCount: number;
}

const PriceChangeReasonsInteractive = () => {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Reason | null>(null);
  const [rowError, setRowError] = useState('');

  const loadReasons = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/price-change-reasons');
      if (!response.ok) throw new Error('No se pudieron cargar los motivos');
      setReasons(await response.json());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los motivos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReasons();
  }, [loadReasons]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (name.length < 2) return setFormError('El motivo debe tener al menos 2 caracteres');
    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch('/api/price-change-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al guardar');
      setNewName('');
      loadReasons();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    const name = editingName.trim();
    if (name.length < 2) return setRowError('El motivo debe tener al menos 2 caracteres');
    setRowError('');
    try {
      const response = await fetch(`/api/price-change-reasons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al actualizar');
      setEditingId(null);
      loadReasons();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/price-change-reasons/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error || 'Error al eliminar');
      }
      setDeleteTarget(null);
      loadReasons();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : 'Error al eliminar');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <p className="text-muted-foreground">
        Motivos que aparecen al cambiar manualmente el precio de una cita. Los cambios ya
        registrados conservan su motivo aunque aquí se edite o elimine.
      </p>

      {/* Alta rápida */}
      <div className="bg-card rounded-lg border border-border p-4 shadow-warm">
        <label htmlFor="newReason" className="block text-sm font-medium text-foreground mb-2">
          Agregar motivo
        </label>
        <div className="flex gap-2">
          <input
            id="newReason"
            type="text"
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value);
              if (formError) setFormError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Ej: Cortesía de cumpleaños"
            className="flex-1 px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
          />
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="px-5 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name="PlusIcon" size={18} />
            Agregar
          </button>
        </div>
        {formError && (
          <p className="mt-2 text-sm text-error flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            {formError}
          </p>
        )}
      </div>

      {/* Listado */}
      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-6 text-sm text-error">{loadError}</div>
        ) : reasons.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="TagIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aún no hay motivos. Agrega el primero arriba.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reasons.map((reason) => (
              <li key={reason.id} className="flex items-center gap-3 px-5 py-3">
                {editingId === reason.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleUpdate(reason.id);
                        if (event.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-3 h-9 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleUpdate(reason.id)}
                      className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{reason.name}</p>
                      <p className="caption text-xs text-muted-foreground">
                        {reason.usageCount === 0
                          ? 'Sin usos'
                          : `Usado en ${reason.usageCount} cambio(s)`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingId(reason.id);
                        setEditingName(reason.name);
                        setRowError('');
                      }}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-smooth"
                      aria-label={`Editar ${reason.name}`}
                      title="Editar"
                    >
                      <Icon name="PencilSquareIcon" size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(reason);
                        setRowError('');
                      }}
                      className="p-2 rounded-lg hover:bg-error/10 text-error transition-smooth"
                      aria-label={`Eliminar ${reason.name}`}
                      title="Eliminar"
                    >
                      <Icon name="TrashIcon" size={18} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {rowError && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{rowError}</span>
        </div>
      )}

      {/* Confirmación de borrado */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <Icon name="TrashIcon" size={24} className="text-error" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Eliminar motivo</h3>
                <p className="text-muted-foreground text-sm">
                  ¿Eliminar <span className="font-medium text-foreground">{deleteTarget.name}</span>? Ya
                  no aparecerá al cambiar precios. Los cambios ya registrados conservan su motivo.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 px-4 bg-error text-error-foreground rounded-lg font-medium hover:bg-error/90 transition-smooth"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceChangeReasonsInteractive;
