'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { formatDuration } from '@/lib/duration';

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

interface ServicePreviewPanelProps {
  formData: ServiceFormData;
  categories: ServiceCategory[];
}

const ServicePreviewPanel = ({ formData, categories }: ServicePreviewPanelProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getCategoryLabel = (category: string): string => {
    const match = categories.find((cat) => String(cat.id) === category);
    return match?.name || 'Sin categoría';
  };

  const formatPrice = (price: string): string => {
    if (!price) return 'L 0.00';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'L 0.00';
    return `L ${numPrice.toFixed(2)}`;
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="h-6 w-32 bg-muted/50 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          <div className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-2 mb-6">
        <Icon name="EyeIcon" size={20} className="text-primary" />
        <h3 className="font-heading font-semibold text-lg text-foreground">
          Vista Previa
        </h3>
      </div>

      <div className="space-y-4">
        <div className="bg-background rounded-lg border border-border p-4">
          {formData.photo && (
            <div className="w-full h-32 rounded-lg overflow-hidden bg-muted mb-3">
              <AppImage src={formData.photo} alt={formData.name || 'Foto del servicio'} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-heading font-semibold text-foreground text-lg mb-1">
                {formData.name || 'Nombre del servicio'}
              </h4>
              {formData.category && (
                <div className="flex items-center gap-2">
                  <Icon
                    name="SparklesIcon"
                    size={16}
                    className="text-primary"
                  />
                  <span className="caption text-muted-foreground text-sm">
                    {getCategoryLabel(formData.category)}
                  </span>
                </div>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              formData.availability
                ? 'bg-success/10 text-success' :'bg-muted text-muted-foreground'
            }`}>
              {formData.availability ? 'Disponible' : 'No disponible'}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {formData.description || 'La descripción del servicio aparecerá aquí...'}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Icon name="ClockIcon" size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {formatDuration(Number(formData.duration))}
              </span>
            </div>
            <div className="text-right">
              <p className="caption text-muted-foreground text-xs mb-1">Precio</p>
              <p className="font-heading font-semibold text-xl text-primary">
                {formatPrice(formData.price)}
              </p>
            </div>
          </div>
        </div>

        {formData.specialRequirements && (
          <div className="bg-accent/10 rounded-lg border border-accent/20 p-4">
            <div className="flex items-start gap-2">
              <Icon name="InformationCircleIcon" size={18} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-accent-foreground mb-1">
                  Requisitos Especiales
                </p>
                <p className="caption text-sm text-accent-foreground/80">
                  {formData.specialRequirements}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted/30 rounded-lg p-4">
          <p className="caption text-xs text-muted-foreground text-center">
            Esta es una vista previa de cómo aparecerá el servicio en el sistema de reservas
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServicePreviewPanel;