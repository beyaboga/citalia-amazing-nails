'use client';

import Icon from '@/components/ui/AppIcon';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkDelete: () => void;
}

const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-lg shadow-warm-xl px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-primary" variant="solid" />
          <span className="font-medium text-foreground">
            {selectedCount} {selectedCount === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
          </span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <button
            onClick={onBulkActivate}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
          >
            <Icon name="CheckIcon" size={16} />
            <span className="caption font-medium">Activar</span>
          </button>

          <button
            onClick={onBulkDeactivate}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
          >
            <Icon name="XMarkIcon" size={16} />
            <span className="caption font-medium">Desactivar</span>
          </button>

          <button
            onClick={onBulkDelete}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          >
            <Icon name="TrashIcon" size={16} />
            <span className="caption font-medium">Eliminar</span>
          </button>

          <button
            onClick={onClearSelection}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Limpiar selección"
          >
            <Icon name="XMarkIcon" size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;