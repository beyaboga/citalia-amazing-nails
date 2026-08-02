'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { ClientFormData } from './ClientInfoForm';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface AppointmentSummaryProps {
  clientData: ClientFormData;
  services: Service[];
  date: string;
  time: string;
}

const AppointmentSummary = ({ clientData, services, date, time }: AppointmentSummaryProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = services.reduce((sum, service) => sum + service.price, 0);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-HN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isComplete = clientData.name && clientData.phone && clientData.email && services.length > 0 && date && time;

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm sticky top-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="DocumentTextIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Resumen de Cita</h2>
          <p className="caption text-muted-foreground text-sm">Verifica los detalles</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Cliente</h3>
          {clientData.name ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon name="UserIcon" size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{clientData.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="PhoneIcon" size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{clientData.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="EnvelopeIcon" size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground truncate">{clientData.email}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin información del cliente</p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Servicios</h3>
          {services.length > 0 ? (
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{service.name}</p>
                    <p className="caption text-muted-foreground text-xs">{service.duration} minutos</p>
                  </div>
                  <span className="data-text text-sm font-medium text-foreground">
                    L {service.price.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No hay servicios seleccionados</p>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Fecha y Hora</h3>
          {date && time ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon name="CalendarIcon" size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground capitalize">{formatDate(date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="ClockIcon" size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{time}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin fecha y hora seleccionada</p>
          )}
        </div>

        {services.length > 0 && (
          <div className="border-t border-border pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duración Total</span>
                <span className="text-sm font-medium text-foreground">{totalDuration} minutos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total a Pagar</span>
                <span className="data-text text-lg font-semibold text-primary">
                  L {totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {!isComplete && (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-start gap-2">
              <Icon name="ExclamationTriangleIcon" size={20} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-foreground">
                Completa todos los campos requeridos para crear la cita
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentSummary;