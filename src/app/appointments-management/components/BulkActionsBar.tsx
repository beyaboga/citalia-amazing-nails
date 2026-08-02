'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}

const BulkActionsBar = ({ selectedCount, onClearSelection, onStatusChange, onDelete }: BulkActionsBarProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'status' | 'delete' | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setActionType('status');
    setShowConfirmDialog(true);
  };

  const handleDelete = () => {
    setActionType('delete');
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (actionType === 'status' && selectedStatus) {
      onStatusChange(selectedStatus);
    } else if (actionType === 'delete') {
      onDelete();
    }
    setShowConfirmDialog(false);
    setActionType(null);
    setSelectedStatus('');
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setActionType(null);
    setSelectedStatus('');
  };

  if (!isHydrated || selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <div className="bg-card rounded-lg border border-border shadow-warm-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-heading font-semibold text-sm text-primary">{selectedCount}</span>
              </div>
              <p className="font-medium text-sm text-foreground">
                {selectedCount} cita{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <Icon name="ArrowPathIcon" size={16} />
                  <span className="hidden sm:inline">Cambiar estado</span>
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-card rounded-lg border border-border shadow-warm-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-smooth">
                  <button
                    onClick={() => handleStatusChange('confirmed')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-smooth first:rounded-t-lg"
                  >
                    <Icon name="CheckCircleIcon" size={16} className="text-primary" />
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-smooth"
                  >
                    <Icon name="CheckBadgeIcon" size={16} className="text-success" />
                    Completar
                  </button>
                  <button
                    onClick={() => handleStatusChange('cancelled')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-smooth last:rounded-b-lg"
                  >
                    <Icon name="XCircleIcon" size={16} className="text-error" />
                    Cancelar
                  </button>
                </div>
              </div>

              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 h-10 rounded-lg bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                <Icon name="TrashIcon" size={16} />
                <span className="hidden sm:inline">Eliminar</span>
              </button>

              <button
                onClick={onClearSelection}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Limpiar selección"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-warning" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  {actionType === 'delete' ? 'Confirmar eliminación' : 'Confirmar cambio de estado'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {actionType === 'delete'
                    ? `¿Está seguro que desea eliminar ${selectedCount} cita${selectedCount !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`
                    : `¿Está seguro que desea cambiar el estado de ${selectedCount} cita${selectedCount !== 1 ? 's' : ''}?`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-6 h-12 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className={`px-6 h-12 rounded-lg font-medium transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  actionType === 'delete'
                    ? 'bg-error text-error-foreground hover:bg-error/90 focus:ring-error' :'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActionsBar;