'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ManualMovementModalProps {
  fundId: number;
  fundName: string;
  onClose: () => void;
  onSaved: () => void;
}

const ManualMovementModal = ({ fundId, fundName, onClose, onSaved }: ManualMovementModalProps) => {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!(Number(amount) > 0)) return setError('El monto debe ser mayor a 0');
    if (!concept.trim() || concept.trim().length < 3)
      return setError('El concepto es obligatorio (mínimo 3 caracteres)');

    setSaving(true);
    try {
      const res = await fetch(`/api/reserve-funds/funds/${fundId}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          amount: Number(amount),
          concept: concept.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok)
        throw new Error((await res.json())?.error || 'No se pudo registrar el movimiento');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg text-foreground">
            Aporte manual — {fundName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Cerrar"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('IN')}
              className={`flex-1 h-11 rounded-lg font-medium text-sm border transition-smooth ${
                direction === 'IN'
                  ? 'bg-success/15 border-success text-success'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Entrada (agregar)
            </button>
            <button
              type="button"
              onClick={() => setDirection('OUT')}
              className={`flex-1 h-11 rounded-lg font-medium text-sm border transition-smooth ${
                direction === 'OUT'
                  ? 'bg-error/15 border-error text-error'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Salida (retirar)
            </button>
          </div>

          <div>
            <label className="caption text-muted-foreground block mb-1">Monto (L)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0.00"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="caption text-muted-foreground block mb-1">Concepto</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Aporte para publicidad de diciembre"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="caption text-muted-foreground block mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-smooth"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
            ) : (
              <Icon name="CheckIcon" size={18} />
            )}
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualMovementModal;
