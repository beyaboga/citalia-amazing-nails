'use client';

import { useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ToastNotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

const ToastNotification = ({ message, type, isVisible, onClose }: ToastNotificationProps) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'CheckCircleIcon',
          bgColor: 'bg-success',
          textColor: 'text-success-foreground',
        };
      case 'error':
        return {
          icon: 'XCircleIcon',
          bgColor: 'bg-destructive',
          textColor: 'text-destructive-foreground',
        };
      default:
        return {
          icon: 'InformationCircleIcon',
          bgColor: 'bg-primary',
          textColor: 'text-primary-foreground',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4">
      <div className={`${styles.bgColor} ${styles.textColor} rounded-lg shadow-warm-xl px-6 py-4 flex items-center gap-3 min-w-[320px]`}>
        <Icon name={styles.icon as any} size={24} variant="solid" />
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-80 transition-smooth focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 rounded"
          aria-label="Cerrar notificación"
        >
          <Icon name="XMarkIcon" size={20} />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;