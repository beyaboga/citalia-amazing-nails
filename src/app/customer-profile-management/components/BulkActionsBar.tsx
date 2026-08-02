'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onClearSelection: () => void;
}

const BulkActionsBar = ({ selectedCount, onAction, onClearSelection }: BulkActionsBarProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleAction = (action: string) => {
    if (action === 'delete') {
      setPendingAction(action);
      setShowConfirm(true);
    } else {
      onAction(action);
    }
  };

  const handleConfirm = () => {
    if (pendingAction) {
      onAction(pendingAction);
    }
    setShowConfirm(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingAction(null);
  };

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-warm-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon name="CheckCircleIcon" size={24} />
            <span className="font-medium">
              {selectedCount} {selectedCount === 1 ? 'cliente seleccionado' : 'clientes seleccionados'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleAction('activate')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-foreground text-primary rounded-lg hover:bg-primary-foreground/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 focus:ring-offset-primary"
            >
              <Icon name="CheckIcon" size={16} />
              <span className="caption font-medium">Activar</span>
            </button>
            <button
              onClick={() => handleAction('deactivate')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-foreground text-primary rounded-lg hover:bg-primary-foreground/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 focus:ring-offset-primary"
            >
              <Icon name="XMarkIcon" size={16} />
              <span className="caption font-medium">Desactivar</span>
            </button>
            <button
              onClick={() => handleAction('vip')}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary"
            >
              <Icon name="StarIcon" size={16} />
              <span className="caption font-medium">Marcar VIP</span>
            </button>
            <button
              onClick={() => handleAction('delete')}
              className="flex items-center gap-2 px-4 py-2 bg-error text-error-foreground rounded-lg hover:bg-error/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 focus:ring-offset-primary"
            >
              <Icon name="TrashIcon" size={16} />
              <span className="caption font-medium">Eliminar</span>
            </button>
            <button
              onClick={onClearSelection}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 focus:ring-offset-primary"
              aria-label="Limpiar selección"
            >
              <Icon name="XMarkIcon" size={20} />
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleCancel}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-lg shadow-warm-xl border border-border p-6 max-w-md w-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-error" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  Confirmar Eliminación
                </h3>
                <p className="text-muted-foreground">
                  ¿Estás seguro de que deseas eliminar {selectedCount} {selectedCount === 1 ? 'cliente' : 'clientes'}? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-error text-error-foreground rounded-lg hover:bg-error/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActionsBar;