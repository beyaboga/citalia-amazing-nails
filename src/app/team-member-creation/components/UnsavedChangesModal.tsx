'use client';

import Icon from '@/components/ui/AppIcon';

interface UnsavedChangesModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const UnsavedChangesModal = ({ onConfirm, onCancel }: UnsavedChangesModalProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border shadow-warm-lg max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Icon name="ExclamationTriangleIcon" size={24} className="text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
              Cambios sin Guardar
            </h3>
            <p className="text-muted-foreground text-sm">
              Tienes cambios sin guardar en el miembro del equipo. ¿Estás seguro de que deseas salir sin guardar?
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 h-12 px-6 bg-error text-white rounded-lg font-medium hover:bg-error/90 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 transition-smooth"
          >
            Salir sin Guardar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth"
          >
            Continuar Editando
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
