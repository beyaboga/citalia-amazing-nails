'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import type { ExpenseCategory } from '@/lib/finance';

const ExpenseCategoriesInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canManage = can('expenses.manage');

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/expense-categories');
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudieron cargar las categorías');
      setCategories(await res.json());
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
    if (!newName.trim() || newName.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres');
    setBusyId('new');
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo guardar');
      setNewName('');
      setNewDescription('');
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
      const res = await fetch(`/api/expense-categories/${id}`, {
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

  const startEdit = (c: ExpenseCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDescription(c.description ?? '');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim() || editName.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres');
    await patch(id, { name: editName.trim(), description: editDescription.trim() });
    setEditingId(null);
  };

  if (!sessionLoading && !canManage) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para administrar categorías de gasto.</p>
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

      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Agregar categoría</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="caption text-muted-foreground block mb-1">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Materiales"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex-1">
            <label className="caption text-muted-foreground block mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-smooth">
                  <td className="px-6 py-4">
                    {editingId === c.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-9 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{c.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === c.id ? (
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full h-9 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">{c.description || '—'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {c.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                        <Icon name="CheckCircleIcon" size={14} /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">Inactiva</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === c.id ? (
                        <>
                          <button onClick={() => saveEdit(c.id)} disabled={busyId === c.id}
                            className="p-2 rounded-lg text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50" aria-label="Guardar">
                            <Icon name="CheckIcon" size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Cancelar">
                            <Icon name="XMarkIcon" size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => patch(c.id, { isActive: !c.isActive })} disabled={busyId === c.id}
                            className="px-3 h-9 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
                            {c.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                          <button onClick={() => startEdit(c)}
                            className="p-2 rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Editar">
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

export default ExpenseCategoriesInteractive;
