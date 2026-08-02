'use client';

import Icon from '@/components/ui/AppIcon';

interface AppointmentHistory {
  id: number;
  date: string;
  time: string;
  services: string[];
  technician: string;
  cost: number;
  rating?: number;
  notes?: string;
}

interface AppointmentHistorySectionProps {
  appointments: AppointmentHistory[];
}

const AppointmentHistorySection = ({ appointments }: AppointmentHistorySectionProps) => {
  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="StarIcon"
            size={14}
            variant={star <= rating ? 'solid' : 'outline'}
            className={star <= rating ? 'text-warning' : 'text-muted-foreground'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <Icon name="ClockIcon" size={24} className="text-primary" />
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Historial de Citas
        </h2>
      </div>

      <div className="space-y-4">
        {appointments.map((appointment, index) => (
          <div
            key={appointment.id}
            className="relative pl-8 pb-6 border-l-2 border-border last:border-l-0 last:pb-0"
          >
            <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background"></div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground mb-1">
                    {appointment.date} - {appointment.time}
                  </p>
                  <div className="flex items-center gap-2">
                    <Icon name="UserIcon" size={14} className="text-muted-foreground" />
                    <span className="caption text-muted-foreground">{appointment.technician}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-data font-semibold text-primary mb-1">
                    L {appointment.cost.toLocaleString()}
                  </p>
                  {renderStars(appointment.rating)}
                </div>
              </div>

              <div className="mb-3">
                <p className="caption text-muted-foreground text-xs mb-2">Servicios:</p>
                <div className="flex flex-wrap gap-2">
                  {appointment.services.map((service, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full caption font-medium text-xs"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {appointment.notes && (
                <div className="pt-3 border-t border-border">
                  <p className="caption text-muted-foreground text-xs mb-1">Notas:</p>
                  <p className="caption text-foreground">{appointment.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {appointments.length === 0 && (
        <div className="text-center py-12">
          <Icon name="CalendarIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay historial de citas disponible</p>
        </div>
      )}
    </div>
  );
};

export default AppointmentHistorySection;