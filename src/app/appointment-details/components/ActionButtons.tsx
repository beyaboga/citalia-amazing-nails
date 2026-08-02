'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ActionButtonsProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive';
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onEdit: () => void;
  onPrint: () => void;
}

const ActionButtons = ({
  status,
  onConfirm,
  onComplete,
  onCancel,
  onReschedule,
  onEdit,
  onPrint
}: ActionButtonsProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Acciones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const canConfirm = status === 'pending';
  const canComplete = status === 'confirmed';
  const canCancel = status === 'pending' || status === 'confirmed';
  const canReschedule = status === 'pending' || status === 'confirmed';
  const canEdit = status !== 'completed' && status !== 'cancelled';

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
        Acciones
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {canConfirm && (
          <button
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Icon name="CheckCircleIcon" size={18} />
            <span>Confirmar</span>
          </button>
        )}
        
        {canComplete && (
          <button
            onClick={onComplete}
            className="flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-success text-success-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-success/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
          >
            <Icon name="CheckBadgeIcon" size={18} />
            <span>Completar</span>
          </button>
        )}
        
        {canReschedule && (
          <button
            onClick={onReschedule}
            className="flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-accent text-accent-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-accent/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            <Icon name="ArrowPathIcon" size={18} />
            <span>Reprogramar</span>
          </button>
        )}
        
        {canEdit && (
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-secondary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          >
            <Icon name="PencilSquareIcon" size={18} />
            <span>Editar</span>
          </button>
        )}
        
        <button
          onClick={onPrint}
          className="flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-card text-foreground border border-border font-medium text-sm hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Icon name="PrinterIcon" size={18} />
          <span>Imprimir</span>
        </button>
        
        {canCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-error text-error-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-error/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
          >
            <Icon name="XCircleIcon" size={18} />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtons;