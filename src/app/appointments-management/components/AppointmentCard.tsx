'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import StatusBadge from './StatusBadge';

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface Appointment {
  id: number;
  clientName: string;
  clientPhone: string;
  clientImage: string;
  clientImageAlt: string;
  date: string;
  time: string;
  services: Service[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive';
  totalDuration: number;
  totalPrice: number;
  notes?: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const AppointmentCard = ({ appointment, isSelected, onSelect }: AppointmentCardProps) => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleViewDetails = () => {
    router.push(`/appointment-details?id=${appointment.id}`);
  };

  const handleCheckboxChange = () => {
    onSelect(appointment.id);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 shadow-warm animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-muted"></div>
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg border ${isSelected ? 'border-primary shadow-warm-md' : 'border-border shadow-warm'} transition-smooth`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="mt-1 w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            aria-label={`Seleccionar cita de ${appointment.clientName}`}
          />

          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
            <AppImage
              src={appointment.clientImage}
              alt={appointment.clientImageAlt}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground truncate">
                  {appointment.clientName}
                </h3>
                <p className="caption text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Icon name="PhoneIcon" size={14} />
                  {appointment.clientPhone}
                </p>
              </div>
              <StatusBadge status={appointment.status} size="sm" />
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Icon name="CalendarIcon" size={16} className="text-muted-foreground" />
                <span>{appointment.date}</span>
                <span className="text-muted-foreground">•</span>
                <Icon name="ClockIcon" size={16} className="text-muted-foreground" />
                <span>{appointment.time}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Icon name="SparklesIcon" size={16} className="text-muted-foreground" />
                <span>{appointment.services.length} servicio{appointment.services.length !== 1 ? 's' : ''}</span>
                <span className="text-muted-foreground">•</span>
                <span>{appointment.totalDuration} min</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium text-primary">L {appointment.totalPrice.toLocaleString('es-HN')}</span>
              </div>
            </div>

            {appointment.services.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1"
              >
                <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} />
                {isExpanded ? 'Ocultar' : 'Ver'} servicios
              </button>
            )}

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {appointment.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{service.name}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{service.duration} min</span>
                      <span className="font-medium text-foreground">L {service.price.toLocaleString('es-HN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={handleViewDetails}
                className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Icon name="EyeIcon" size={16} />
                Ver detalles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;