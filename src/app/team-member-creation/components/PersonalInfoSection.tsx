'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface PersonalInfoData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terminationDate: string;
}

interface PersonalInfoSectionProps {
  data: PersonalInfoData;
  onChange: (data: PersonalInfoData) => void;
  isEditMode?: boolean;
}

const PersonalInfoSection = ({ data, onChange, isEditMode = false }: PersonalInfoSectionProps) => {
  const [errors, setErrors] = useState<Partial<PersonalInfoData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalInfoData, boolean>>>({});

  const validateField = (name: keyof PersonalInfoData, value: string, allData: PersonalInfoData): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        return '';
      case 'email':
        if (!value.trim()) return 'El correo electrónico es obligatorio';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo electrónico inválido';
        return '';
      case 'phone':
        if (value.trim() && !/^\d{8}$/.test(value.replace(/\s/g, ''))) return 'El teléfono debe tener 8 dígitos';
        return '';
      case 'password':
        // Al editar, dejarla vacía significa conservar la contraseña actual.
        if (!value) return isEditMode ? '' : 'La contraseña es obligatoria';
        if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        return '';
      case 'confirmPassword':
        if (value !== allData.password) return 'Las contraseñas no coinciden';
        return '';
      default:
        return '';
    }
  };

  const isExpired = Boolean(data.terminationDate) && data.terminationDate < new Date().toISOString().slice(0, 10);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newData = { ...data, [name]: value };
    onChange(newData);

    if (touched[name as keyof PersonalInfoData]) {
      const error = validateField(name as keyof PersonalInfoData, value, newData);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
    if (name === 'password' && touched.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateField('confirmPassword', newData.confirmPassword, newData) }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name as keyof PersonalInfoData, value, data);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="UserIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Información Personal</h2>
          <p className="caption text-muted-foreground text-sm">Datos de cuenta del miembro del equipo</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Nombre completo <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={data.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 h-12 rounded-lg border ${
              errors.name && touched.name ? 'border-error' : 'border-input'
            } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
            placeholder="Ej: Laura Rodríguez"
          />
          {errors.name && touched.name && (
            <p className="mt-1 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Correo Electrónico <span className="text-error">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="off"
              value={data.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 h-12 rounded-lg border ${
                errors.email && touched.email ? 'border-error' : 'border-input'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
              placeholder="Ej: laura@amazingnails.com"
            />
            {errors.email && touched.email && (
              <p className="mt-1 text-sm text-error flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={16} />
                {errors.email}
              </p>
            )}
            <p className="caption text-muted-foreground text-xs mt-1">Se usa para iniciar sesión</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={data.phone}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Contraseña {!isEditMode && <span className="text-error">*</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              value={data.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 h-12 rounded-lg border ${
                errors.password && touched.password ? 'border-error' : 'border-input'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
              placeholder={isEditMode ? 'Dejar vacío para no cambiarla' : 'Mínimo 8 caracteres'}
            />
            {errors.password && touched.password && (
              <p className="mt-1 text-sm text-error flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={16} />
                {errors.password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirmar Contraseña {!isEditMode && <span className="text-error">*</span>}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              value={data.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 h-12 rounded-lg border ${
                errors.confirmPassword && touched.confirmPassword ? 'border-error' : 'border-input'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
              placeholder="Repite la contraseña"
            />
            {errors.confirmPassword && touched.confirmPassword && (
              <p className="mt-1 text-sm text-error flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={16} />
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-2">
          <label htmlFor="terminationDate" className="block text-sm font-medium text-foreground mb-2">
            Fecha de Finalización
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="date"
              id="terminationDate"
              name="terminationDate"
              value={data.terminationDate}
              onChange={handleChange}
              className={`w-full sm:w-auto px-4 h-12 rounded-lg border ${
                isExpired ? 'border-error' : 'border-input'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth`}
            />
            {data.terminationDate && (
              <button
                type="button"
                onClick={() => onChange({ ...data, terminationDate: '' })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth focus:outline-none focus:underline"
              >
                <Icon name="XMarkIcon" size={16} />
                Quitar fecha
              </button>
            )}
          </div>
          {isExpired ? (
            <p className="mt-2 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              Esta fecha ya pasó — la cuenta no podrá iniciar sesión
            </p>
          ) : (
            <p className="caption text-muted-foreground text-xs mt-1">
              Último día con acceso al sistema. Déjala vacía si el acceso no vence.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;
