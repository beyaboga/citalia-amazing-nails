'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

interface AppointmentTimelineProps {
  events: TimelineEvent[];
}

const AppointmentTimeline = ({ events }: AppointmentTimelineProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      'Creada': 'PlusCircleIcon',
      'Confirmada': 'CheckCircleIcon',
      'Reprogramada': 'ArrowPathIcon',
      'Completada': 'CheckBadgeIcon',
      'Cancelada': 'XCircleIcon',
      'Modificada': 'PencilSquareIcon'
    };
    return icons[action] || 'ClockIcon';
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'Creada': 'text-primary',
      'Confirmada': 'text-primary',
      'Reprogramada': 'text-warning',
      'Completada': 'text-success',
      'Cancelada': 'text-error',
      'Modificada': 'text-accent'
    };
    return colors[action] || 'text-muted-foreground';
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Historial de Cambios
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
        Historial de Cambios
      </h2>
      
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full bg-card border-2 flex items-center justify-center ${getActionColor(event.action)} border-current`}>
                <Icon name={getActionIcon(event.action) as any} size={16} />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-2" />
              )}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium text-foreground text-sm">
                  {event.action}
                </h3>
                <span className="caption text-muted-foreground text-xs whitespace-nowrap">
                  {event.timestamp}
                </span>
              </div>
              <p className="caption text-muted-foreground text-sm mb-1">
                Por: {event.user}
              </p>
              {event.details && (
                <p className="caption text-foreground/80 text-sm">
                  {event.details}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentTimeline;