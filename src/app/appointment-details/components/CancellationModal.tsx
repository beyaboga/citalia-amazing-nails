'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  appointmentId: string;
}

const CancellationModal = ({ isOpen, onClose, onConfirm, appointmentId }: CancellationModalProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isOpen && isHydrated) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isHydrated]);

  const handleConfirm = () => {
    const reason = selectedReason === 'Otro' ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(reason);
      setSelectedReason('');
      setCustomReason('');
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  if (!isHydrated || !isOpen) return null;

  const cancellationReasons = [
    'Cliente solicitó cancelación',
    'Conflicto de horario',
    'Emergencia personal',
    'Problema de salud',
    'Cliente no confirmó',
    'Otro'
  ];

  const isValid = selectedReason && (selectedReason !== 'Otro' || customReason.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      <div className="relative bg-card rounded-lg shadow-warm-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <Icon name="ExclamationTriangleIcon" size={20} className="text-error" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Cancelar Cita
                </h2>
                <p className="caption text-muted-foreground text-sm">
                  Cita #{appointmentId}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-muted transition-smooth flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Cerrar modal"
            >
              <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="caption text-warning-foreground text-sm">
              Esta acción no se puede deshacer. La cita será marcada como cancelada y el cliente será notificado.
            </p>
          </div>
          
          <div>
            <label className="block font-medium text-foreground text-sm mb-3">
              Motivo de cancelación *
            </label>
            <div className="space-y-2">
              {cancellationReasons.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-smooth"
                >
                  <input
                    type="radio"
                    name="cancellation-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="caption text-foreground">{reason}</span>
                </label>
              ))}
            </div>
          </div>
          
          {selectedReason === 'Otro' && (
            <div>
              <label htmlFor="custom-reason" className="block font-medium text-foreground text-sm mb-2">
                Especificar motivo *
              </label>
              <textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ingrese el motivo de cancelación..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth resize-none"
              />
            </div>
          )}
        </div>
        
        <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 h-12 rounded-lg bg-card text-foreground border border-border font-medium text-sm hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Volver
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1 px-4 h-12 rounded-lg bg-error text-error-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-error/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-warm"
          >
            Confirmar Cancelación
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;