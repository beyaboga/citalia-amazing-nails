'use client';

import { useState, useEffect, FormEvent } from 'react';
import Icon from '@/components/ui/AppIcon';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PasswordRecoveryModal = ({ isOpen, onClose }: PasswordRecoveryModalProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setEmail('');
      setError('');
      setIsSuccess(false);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingrese un correo electrónico válido');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  if (!isOpen || !isHydrated) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
    >
      <div
        className="w-full max-w-md bg-card rounded-xl shadow-warm-xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="recovery-modal-title" className="font-heading text-xl font-semibold text-foreground">
            Recuperar Contraseña
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cerrar modal"
          >
            <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <Icon name="CheckCircleIcon" size={32} className="text-success" variant="solid" />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Correo Enviado
                </h3>
                <p className="text-sm text-muted-foreground">
                  Hemos enviado las instrucciones de recuperación a <strong>{email}</strong>. Por favor revise su bandeja de entrada.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Entendido
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Ingrese su correo electrónico y le enviaremos instrucciones para restablecer su contraseña.
              </p>

              <div>
                <label htmlFor="recovery-email" className="block text-sm font-medium text-foreground mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <input
                    id="recovery-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={isLoading}
                    className={`w-full h-12 px-4 pr-10 rounded-lg border ${
                      error ? 'border-error' : 'border-border'
                    } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Icon name="EnvelopeIcon" size={20} className="text-muted-foreground" />
                  </div>
                </div>
                {error && (
                  <p className="mt-1 text-sm text-error flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size={16} />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-muted text-foreground rounded-lg font-medium text-sm hover:bg-muted/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    'Enviar Instrucciones'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordRecoveryModal;