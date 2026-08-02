'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { RECEIPT_ACCEPT, type Expense, type ExpenseStatus } from '@/lib/finance';

interface Option {
  id: number;
  name: string;
}

interface ExpenseFormModalProps {
  categories: Option[];
  methods: Option[];
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const ExpenseFormModal = ({ categories, methods, editing, onClose, onSaved }: ExpenseFormModalProps) => {
  const [supplierName, setSupplierName] = useState(editing?.supplierName ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [categoryId, setCategoryId] = useState<string>(editing ? String(editing.categoryId) : '');
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '');
  const [expenseDate, setExpenseDate] = useState(editing?.expenseDate ?? today());
  const [paymentMethodId, setPaymentMethodId] = useState<string>(editing ? String(editing.paymentMethodId) : '');
  const [status, setStatus] = useState<ExpenseStatus>(editing?.status ?? 'PENDING');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(editing);

  const handleSubmit = async () => {
    setError('');
    if (!categoryId) return setError('Seleccione una categoría');
    if (!description.trim()) return setError('El concepto es obligatorio');
    if (!(Number(amount) > 0)) return setError('El monto debe ser mayor a 0');
    if (!paymentMethodId) return setError('Seleccione un método de pago');

    setSaving(true);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/expenses/${editing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierName, description, categoryId: Number(categoryId), amount: Number(amount),
            expenseDate, paymentMethodId: Number(paymentMethodId), status, notes,
          }),
        });
      } else {
        const fd = new FormData();
        fd.set('supplierName', supplierName);
        fd.set('description', description);
        fd.set('categoryId', categoryId);
        fd.set('amount', amount);
        fd.set('expenseDate', expenseDate);
        fd.set('paymentMethodId', paymentMethodId);
        fd.set('status', status);
        fd.set('notes', notes);
        if (file) fd.set('receipt', file);
        res = await fetch('/api/expenses', { method: 'POST', body: fd });
      }
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo guardar el gasto');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-warm-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h3 className="font-heading font-semibold text-xl text-foreground">
            {isEdit ? 'Editar gasto' : 'Registrar gasto'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Cerrar">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon name="ExclamationCircleIcon" size={18} className="text-error flex-shrink-0" />
              <span className="text-sm text-error font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="caption text-muted-foreground block mb-1">Concepto *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Compra de esmaltes"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="caption text-muted-foreground block mb-1">Categoría *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Seleccione…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">L</span>
                <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="caption text-muted-foreground block mb-1">Fecha *</label>
              <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Método de pago *</label>
              <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Seleccione…</option>
                {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="caption text-muted-foreground block mb-1">Proveedor (opcional)</label>
              <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="PENDING">Pendiente</option>
                <option value="PAID">Pagado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="caption text-muted-foreground block mb-1">Observaciones (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {!isEdit && (
            <div>
              <label className="caption text-muted-foreground block mb-1">Comprobante (opcional · imagen o PDF)</label>
              <input type="file" accept={RECEIPT_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-foreground file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20" />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-border sticky bottom-0 bg-card">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Icon name="ArrowPathIcon" size={18} className="animate-spin" /> : <Icon name="CheckIcon" size={18} />}
            {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
          <button onClick={onClose} disabled={saving}
            className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
