'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ClientInfoFormProps {
  onDataChange: (data: ClientFormData) => void;
  initialData?: ClientFormData;
}

export interface ClientFormData {
  name: string;
  phone: string;
  email: string;
}

const ClientInfoForm = ({ onDataChange, initialData }: ClientInfoFormProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || ''
  });

  const [errors, setErrors] = useState<Partial<ClientFormData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ClientFormData, boolean>>>({});

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      onDataChange(formData);
    }
  }, [formData, isHydrated, onDataChange]);

  const validateField = (name: keyof ClientFormData, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        return '';
      case 'phone':
        if (!value.trim()) return 'El teléfono es obligatorio';
        if (!/^\d{8}$/.test(value.replace(/\s/g, ''))) return 'El teléfono debe tener 8 dígitos';
        return '';
      case 'email':
        if (!value.trim()) return 'El correo electrónico es obligatorio';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo electrónico inválido';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name as keyof ClientFormData]) {
      const error = validateField(name as keyof ClientFormData, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name as keyof ClientFormData, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="UserIcon" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">Información del Cliente</h2>
            <p className="caption text-muted-foreground text-sm">Datos de contacto del cliente</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="UserIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Información del Cliente</h2>
          <p className="caption text-muted-foreground text-sm">Datos de contacto del cliente</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Nombre Completo <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 h-12 rounded-lg border ${
              errors.name && touched.name ? 'border-error' : 'border-input'
            } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
            placeholder="Ej: María González"
          />
          {errors.name && touched.name && (
            <p className="mt-1 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Teléfono <span className="text-error">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 h-12 rounded-lg border ${
              errors.phone && touched.phone ? 'border-error' : 'border-input'
            } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
            placeholder="Ej: 98765432"
          />
          {errors.phone && touched.phone && (
            <p className="mt-1 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Correo Electrónico <span className="text-error">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 h-12 rounded-lg border ${
              errors.email && touched.email ? 'border-error' : 'border-input'
            } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
            placeholder="Ej: maria@ejemplo.com"
          />
          {errors.email && touched.email && (
            <p className="mt-1 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              {errors.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInfoForm;