'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import ExpenseFormModal from './ExpenseFormModal';
import { formatLempiras } from '@/lib/payroll';
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_CLASSES, type Expense, type ExpenseCategory } from '@/lib/finance';

interface MethodOption { id: number; name: string }

const ExpensesInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canRegister = can('expenses.register');
  const canManage = can('expenses.manage');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('categoryId', category);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudieron cargar los gastos');
      setExpenses(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [category, status, from, to]);

  useEffect(() => {
    if (canRegister) load();
  }, [canRegister, load]);

  useEffect(() => {
    fetch('/api/expense-categories').then((r) => (r.ok ? r.json() : [])).then((rows: ExpenseCategory[]) =>
      setCategories(rows.filter((c) => c.isActive))
    ).catch(() => {});
    fetch('/api/payment-methods').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setMethods(rows.filter((m) => m.isActive && m.type !== 'SPLIT_PAYMENT').map((m) => ({ id: m.id, name: m.name })))
    ).catch(() => {});
  }, []);

  const changeStatus = async (id: number, newStatus: string) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo actualizar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return;
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo eliminar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setBusyId(null);
    }
  };

  if (!sessionLoading && !canRegister) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver o registrar gastos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros + acción */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <div>
              <label className="caption text-muted-foreground block mb-1">Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todas</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="PAID">Pagado</option>
                <option value="VOIDED">Anulado</option>
              </select>
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Desde</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Hasta</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="h-11 px-5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth flex items-center justify-center gap-2 flex-shrink-0">
            <Icon name="PlusIcon" size={18} /> Registrar gasto
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="BanknotesIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No hay gastos para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Concepto</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Método</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => {
                  const isVoided = e.status === 'VOIDED';
                  const isPaid = e.status === 'PAID';
                  return (
                    <tr key={e.id} className={`hover:bg-muted/20 ${isVoided ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{e.expenseDate}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{e.description}</p>
                        {e.supplierName && <p className="caption text-muted-foreground text-xs">{e.supplierName}</p>}
                      </td>
                      <td className="px-4 py-3 text-foreground">{e.categoryName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.paymentMethodName}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{formatLempiras(e.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${EXPENSE_STATUS_CLASSES[e.status]}`}>
                          {EXPENSE_STATUS_LABELS[e.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {e.hasReceipt && (
                            <a href={`/api/expenses/${e.id}/receipt`} target="_blank" rel="noopener noreferrer"
                              className="p-2 rounded-lg text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary" title="Ver comprobante" aria-label="Ver comprobante">
                              <Icon name="PaperClipIcon" size={16} />
                            </a>
                          )}
                          {!isVoided && e.status === 'PENDING' && (
                            <button onClick={() => changeStatus(e.id, 'PAID')} disabled={busyId === e.id}
                              className="px-2.5 h-8 rounded-lg text-xs font-medium text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50">
                              Marcar pagado
                            </button>
                          )}
                          {!isVoided && (!isPaid || canManage) && (
                            <button onClick={() => { setEditing(e); setModalOpen(true); }}
                              className="p-2 rounded-lg text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary" title="Editar" aria-label="Editar">
                              <Icon name="PencilIcon" size={16} />
                            </button>
                          )}
                          {!isVoided && canManage && (
                            <button onClick={() => changeStatus(e.id, 'VOIDED')} disabled={busyId === e.id}
                              className="p-2 rounded-lg text-warning-foreground hover:bg-warning/20 focus:outline-none focus:ring-2 focus:ring-warning disabled:opacity-50" title="Anular" aria-label="Anular">
                              <Icon name="NoSymbolIcon" size={16} />
                            </button>
                          )}
                          {canManage && (
                            <button onClick={() => remove(e.id)} disabled={busyId === e.id}
                              className="p-2 rounded-lg text-error hover:bg-error/10 focus:outline-none focus:ring-2 focus:ring-error disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
                              <Icon name="TrashIcon" size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ExpenseFormModal
          categories={categories}
          methods={methods}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
};

export default ExpensesInteractive;
