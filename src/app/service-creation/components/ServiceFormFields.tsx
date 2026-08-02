'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { DURATION_OPTIONS, formatDuration } from '@/lib/duration';
import CategorySelect from './CategorySelect';

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  duration: string;
  availability: boolean;
  specialRequirements: string;
  photo: string;
}

interface ServiceCategory {
  id: number;
  name: string;
  icon: string | null;
}

interface ServiceFormFieldsProps {
  formData: ServiceFormData;
  errors: Record<string, string>;
  onFieldChange: (field: keyof ServiceFormData, value: string | boolean) => void;
  categories: ServiceCategory[];
  isLoadingCategories: boolean;
  onAddCategory: () => void;
}

const ServiceFormFields = ({ formData, errors, onFieldChange, categories, isLoadingCategories, onAddCategory }: ServiceFormFieldsProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onFieldChange('photo', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onFieldChange('photo', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Foto del Servicio</label>
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
            {formData.photo ? (
              <>
                <AppImage src={formData.photo} alt="Foto del servicio" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute inset-0 bg-background/80 opacity-0 hover:opacity-100 transition-smooth flex items-center justify-center"
                >
                  <Icon name="TrashIcon" size={20} className="text-error" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="PhotoIcon" size={28} className="text-muted-foreground" />
              </div>
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="service-photo-upload"
            />
            <label
              htmlFor="service-photo-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 cursor-pointer transition-smooth"
            >
              <Icon name="CameraIcon" size={18} />
              {formData.photo ? 'Cambiar Foto' : 'Subir Foto'}
            </label>
            <p className="caption text-muted-foreground text-xs mt-2">JPG, PNG o GIF (máx. 5MB)</p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="serviceName" className="block text-sm font-medium text-foreground mb-2">
          Nombre del Servicio <span className="text-error">*</span>
        </label>
        <input
          type="text"
          id="serviceName"
          value={formData.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          className={`w-full px-4 h-12 rounded-lg border ${
            errors.name ? 'border-error' : 'border-border'
          } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth`}
          placeholder="Ej: Manicura Clásica"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="serviceDescription" className="block text-sm font-medium text-foreground mb-2">
          Descripción <span className="text-error">*</span>
        </label>
        <textarea
          id="serviceDescription"
          value={formData.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          rows={4}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.description ? 'border-error' : 'border-border'
          } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none`}
          placeholder="Describe el servicio en detalle..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-error flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            {errors.description}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="serviceCategory" className="block text-sm font-medium text-foreground mb-2">
          Categoría <span className="text-error">*</span>
        </label>
        <CategorySelect
          categories={categories}
          value={formData.category}
          onChange={(id) => onFieldChange('category', id)}
          onAddCategory={onAddCategory}
          error={Boolean(errors.category)}
          isLoading={isLoadingCategories}
        />
        {errors.category && (
          <p className="mt-1 text-sm text-error flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={16} />
            {errors.category}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="servicePrice" className="block text-sm font-medium text-foreground mb-2">
            Precio (HNL) <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              L
            </span>
            <input
              type="text"
              id="servicePrice"
              value={formData.price}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d.]/g, '');
                onFieldChange('price', value);
              }}
              className={`w-full pl-10 pr-4 h-12 rounded-lg border ${
                errors.price ? 'border-error' : 'border-border'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth`}
              placeholder="0.00"
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              {errors.price}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="serviceDuration" className="block text-sm font-medium text-foreground mb-2">
            Duración <span className="text-error">*</span>
          </label>
          <div className="relative">
            <select
              id="serviceDuration"
              value={formData.duration}
              onChange={(e) => onFieldChange('duration', e.target.value)}
              className={`w-full px-4 h-12 rounded-lg border ${
                errors.duration ? 'border-error' : 'border-border'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth appearance-none cursor-pointer`}
            >
              <option value="">Seleccionar duración</option>
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={String(minutes)}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </select>
            <Icon
              name="ChevronDownIcon"
              size={20}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
          {errors.duration && (
            <p className="mt-1 text-sm text-error flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={16} />
              {errors.duration}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="specialRequirements" className="block text-sm font-medium text-foreground mb-2">
          Requisitos Especiales
        </label>
        <textarea
          id="specialRequirements"
          value={formData.specialRequirements}
          onChange={(e) => onFieldChange('specialRequirements', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
          placeholder="Ej: Cliente debe llegar con uñas limpias y sin esmalte"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="font-medium text-foreground">Disponibilidad del Servicio</p>
          <p className="caption text-muted-foreground text-sm">
            Activar para que aparezca en el sistema de reservas
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFieldChange('availability', !formData.availability)}
          className={`relative w-14 h-7 rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            formData.availability ? 'bg-primary' : 'bg-muted'
          }`}
          aria-label="Toggle service availability"
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-warm transition-smooth ${
              formData.availability ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default ServiceFormFields;