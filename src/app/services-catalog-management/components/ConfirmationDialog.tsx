'use client';

import { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'ExclamationTriangleIcon',
          iconColor: 'text-destructive',
          iconBg: 'bg-destructive/10',
          buttonClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        };
      case 'warning':
        return {
          icon: 'ExclamationCircleIcon',
          iconColor: 'text-warning',
          iconBg: 'bg-warning/10',
          buttonClass: 'bg-warning text-warning-foreground hover:bg-warning/90',
        };
      default:
        return {
          icon: 'InformationCircleIcon',
          iconColor: 'text-primary',
          iconBg: 'bg-primary/10',
          buttonClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-card rounded-lg shadow-warm-xl border border-border animate-in zoom-in-95"
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <Icon name={styles.icon as any} size={24} className={styles.iconColor} />
            </div>
            <div className="flex-1">
              <h3 id="dialog-title" className="font-heading font-semibold text-lg text-foreground mb-2">
                {title}
              </h3>
              <p id="dialog-description" className="text-muted-foreground text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-12 px-6 rounded-lg border border-border text-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span className="font-medium">{cancelLabel}</span>
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-12 px-6 rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${styles.buttonClass}`}
          >
            <span className="font-medium">{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;