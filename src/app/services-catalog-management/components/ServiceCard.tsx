'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { formatDuration } from '@/lib/duration';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  isActive: boolean;
  image: string;
  alt: string;
  description: string;
}

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

const ServiceCard = ({
  service,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onToggleStatus,
}: ServiceCardProps) => {
  const [imageError, setImageError] = useState(false);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      manicure: 'bg-primary/10 text-primary',
      pedicure: 'bg-secondary/10 text-secondary',
      reinforcement: 'bg-accent/10 text-accent-foreground',
      'semi-permanent': 'bg-success/10 text-success',
      polygel: 'bg-warning/10 text-warning-foreground',
    };
    return colors[category.toLowerCase()] || 'bg-muted text-muted-foreground';
  };

  return (
    <div
      className={`
        relative bg-card rounded-lg border-2 transition-smooth overflow-hidden
        ${isSelected ? 'border-primary shadow-warm-md' : 'border-border hover:border-primary/50 hover:shadow-warm'}
      `}
    >
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => onToggleSelect(service.id)}
          className="w-6 h-6 rounded border-2 bg-card flex items-center justify-center transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={isSelected ? 'Deseleccionar servicio' : 'Seleccionar servicio'}
        >
          {isSelected && <Icon name="CheckIcon" size={16} className="text-primary" />}
        </button>
      </div>

      <div className="relative h-48 overflow-hidden bg-muted">
        {!imageError ? (
          <AppImage
            src={service.image}
            alt={service.alt}
            className="w-full h-full object-contain"
            onClick={() => onEdit(service.id)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Icon name="PhotoIcon" size={48} className="text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <span className={`caption px-3 py-1 rounded-full font-medium ${getCategoryColor(service.category)}`}>
            {service.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="flex-1 min-w-0 font-heading font-semibold text-lg text-foreground line-clamp-3">{service.name}</h3>
          <button
            onClick={() => onToggleStatus(service.id)}
            className={`
              flex-shrink-0 w-12 h-6 rounded-full transition-smooth relative
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${service.isActive ? 'bg-success' : 'bg-muted'}
            `}
            aria-label={service.isActive ? 'Desactivar servicio' : 'Activar servicio'}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-smooth shadow-warm-sm
                ${service.isActive ? 'right-1' : 'left-1'}
              `}
            />
          </button>
        </div>

        <p className="caption text-muted-foreground text-sm mb-4 line-clamp-2">{service.description}</p>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Icon name="CurrencyDollarIcon" size={18} className="text-muted-foreground" />
            <span className="data-text font-medium text-foreground">L {service.price.toLocaleString('es-HN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="ClockIcon" size={18} className="text-muted-foreground" />
            <span className="caption text-muted-foreground">{formatDuration(service.duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(service.id)}
            className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Icon name="PencilIcon" size={16} />
            <span className="caption font-medium">Editar</span>
          </button>
          <button
            onClick={() => onDuplicate(service.id)}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Duplicar servicio"
          >
            <Icon name="DocumentDuplicateIcon" size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {!service.isActive && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <span className="caption px-4 py-2 rounded-lg bg-card border border-border font-medium text-muted-foreground">
            Servicio Inactivo
          </span>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;