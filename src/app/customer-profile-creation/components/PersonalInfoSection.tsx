'use client';

import { useState, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface PersonalInfoData {
  name: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  photo: string;
  status: 'active' | 'inactive' | 'vip';
}

interface PersonalInfoSectionProps {
  data: PersonalInfoData;
  onChange: (data: PersonalInfoData) => void;
  isEditMode?: boolean;
}

const PersonalInfoSection = ({ data, onChange, isEditMode = false }: PersonalInfoSectionProps) => {
  const [errors, setErrors] = useState<Partial<PersonalInfoData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalInfoData, boolean>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateField = (name: keyof PersonalInfoData, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        return '';
      case 'phone':
        if (value.trim() && !/^\d{8}$/.test(value.replace(/\s/g, ''))) return 'El teléfono debe tener 8 dígitos';
        return '';
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo electrónico inválido';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newData = { ...data, [name]: value };
    onChange(newData);
    
    if (touched[name as keyof PersonalInfoData]) {
      const error = validateField(name as keyof PersonalInfoData, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name as keyof PersonalInfoData, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...data, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    onChange({ ...data, photo: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="UserIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Información Personal</h2>
          <p className="caption text-muted-foreground text-sm">Datos básicos del cliente</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 pb-6 border-b border-border">
          <div className="relative">
            {data.photo ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
                <AppImage
                  src={data.photo}
                  alt="Foto del cliente"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute inset-0 bg-background/80 opacity-0 hover:opacity-100 transition-smooth flex items-center justify-center"
                  type="button"
                >
                  <Icon name="TrashIcon" size={20} className="text-error" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <Icon name="UserIcon" size={40} className="text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 cursor-pointer transition-smooth"
            >
              <Icon name="CameraIcon" size={18} />
              {data.photo ? 'Cambiar Foto' : 'Subir Foto'}
            </label>
            <p className="caption text-muted-foreground text-xs mt-2">JPG, PNG o GIF (máx. 5MB)</p>
          </div>
        </div>

        <div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Nombre Completo <span className="text-error">*</span>
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
              placeholder="Ej: María Fernanda González Cruz"
            />
            {errors.name && touched.name && (
              <p className="mt-1 text-sm text-error flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={16} />
                {errors.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={data.email}
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

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
            Dirección
          </label>
          <textarea
            id="address"
            name="address"
            value={data.address}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
            placeholder="Ej: Col. Palmira, Calle Principal, Casa #123"
          />
        </div>

        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium text-foreground mb-2">
            Fecha de Nacimiento
          </label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            value={data.birthDate}
            onChange={handleChange}
            className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
          />
          <p className="caption text-muted-foreground text-xs mt-1">
            Utilizado para campañas promocionales de cumpleaños
          </p>
        </div>

        {isEditMode && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
              Estado del Cliente
            </label>
            <select
              id="status"
              name="status"
              value={data.status}
              onChange={(e) => onChange({ ...data, status: e.target.value as PersonalInfoData['status'] })}
              className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoSection;