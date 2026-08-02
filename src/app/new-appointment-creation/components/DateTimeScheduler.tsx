'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface DateTimeSchedulerProps {
  onDateTimeChange: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

const DateTimeScheduler = ({ onDateTimeChange, selectedDate = '', selectedTime = '' }: DateTimeSchedulerProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState(selectedTime);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && date) {
      const slots = generateTimeSlots();
      setAvailableSlots(slots);
    }
  }, [date, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      onDateTimeChange(date, time);
    }
  }, [date, time, isHydrated, onDateTimeChange]);

  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    
    return slots;
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  const isSlotAvailable = (slot: string): boolean => {
    const unavailableSlots = ['10:00', '14:00', '16:30'];
    return !unavailableSlots.includes(slot);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="CalendarIcon" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">Fecha y Hora</h2>
            <p className="caption text-muted-foreground text-sm">Selecciona cuándo será la cita</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="CalendarIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Fecha y Hora</h2>
          <p className="caption text-muted-foreground text-sm">Selecciona cuándo será la cita</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-2">
            Fecha de la Cita <span className="text-error">*</span>
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
          />
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
            <Icon name="InformationCircleIcon" size={16} />
            Las citas deben agendarse con al menos 24 horas de anticipación
          </p>
        </div>

        {date && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Horarios Disponibles <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {availableSlots.map(slot => {
                const available = isSlotAvailable(slot);
                const selected = time === slot;
                
                return (
                  <button
                    key={slot}
                    onClick={() => available && setTime(slot)}
                    disabled={!available}
                    className={`h-12 rounded-lg font-medium text-sm transition-smooth ${
                      selected
                        ? 'bg-primary text-primary-foreground shadow-warm'
                        : available
                        ? 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                        : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <Icon name="ClockIcon" size={20} className="text-accent-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-accent-foreground">
                <p className="font-medium mb-1">Horario de Atención</p>
                <p className="caption">Lunes a Sábado: 9:00 AM - 6:00 PM</p>
                <p className="caption">Domingo: Cerrado</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateTimeScheduler;