'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface LoginFormProps {
  onSubmit: (email: string, password: string, rememberMe: boolean) => Promise<void>;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Por favor ingrese un correo electrónico válido';
    }

    if (!password.trim()) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await onSubmit(email, password, rememberMe);
    } catch (error) {
      setErrors({
        general: 'Credenciales inválidas. Por favor verifique su correo y contraseña.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Correo Electrónico
          </label>
          <div className="relative">
            <input
              type="email"
              disabled
              value=""
              onChange={() => {}}
              className="w-full h-12 px-4 pr-10 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Contraseña
          </label>
          <div className="relative">
            <input
              type="password"
              disabled
              value=""
              onChange={() => {}}
              className="w-full h-12 px-4 pr-10 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled
              checked={false}       // ✅
              onChange={() => {}}   // ✅ opcional
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm text-muted-foreground">Recordarme</span>
          </label>
        </div>

        <button
          type="submit"
          disabled
          className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Iniciar Sesión
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error">{errors.general}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          Correo Electrónico
        </label>
        <div className="relative">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors({ ...errors, email: undefined });
              }
            }}
            disabled={isLoading}
            className={`w-full h-12 px-4 pr-10 rounded-lg border ${
              errors.email ? 'border-error' : 'border-border'
            } bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed`}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Icon name="EnvelopeIcon" size={20} className="text-muted-foreground" />
          </div>
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-error flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors({ ...errors, password: undefined });
              }
            }}
            disabled={isLoading}
            className={`w-full h-12 px-4 pr-10 rounded-lg border ${
              errors.password ? 'border-error' : 'border-border'
            } bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed`}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth focus:outline-none disabled:opacity-50"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={20} />
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-error flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-muted-foreground">Recordarme</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            <span>Iniciando sesión...</span>
          </>
        ) : (
          'Iniciar Sesión'
        )}
      </button>
    </form>
  );
};

export default LoginForm;