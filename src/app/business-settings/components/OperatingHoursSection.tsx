'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  day: string;
  dayLabel: string;
  enabled: boolean;
  slots: TimeSlot[];
}

interface OperatingHoursSectionProps {
  onSave?: (schedule: DaySchedule[]) => void;
}

const OperatingHoursSection = ({ onSave }: OperatingHoursSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: 'monday', dayLabel: 'Lunes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 'tuesday', dayLabel: 'Martes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 'wednesday', dayLabel: 'Miércoles', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 'thursday', dayLabel: 'Jueves', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 'friday', dayLabel: 'Viernes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 'saturday', dayLabel: 'Sábado', enabled: true, slots: [{ start: '10:00', end: '16:00' }] },
    { day: 'sunday', dayLabel: 'Domingo', enabled: false, slots: [{ start: '10:00', end: '14:00' }] },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setIsHydrated(true);
    const savedSchedule = localStorage.getItem('operatingHours');
    if (savedSchedule) {
      setSchedule(JSON.parse(savedSchedule));
    }
  }, []);

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].enabled = !newSchedule[index].enabled;
    setSchedule(newSchedule);
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots[slotIndex][field] = value;
    setSchedule(newSchedule);
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots.push({ start: '09:00', end: '18:00' });
    setSchedule(newSchedule);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...schedule];
    if (newSchedule[dayIndex].slots.length > 1) {
      newSchedule[dayIndex].slots.splice(slotIndex, 1);
      setSchedule(newSchedule);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (isHydrated) {
      localStorage.setItem('operatingHours', JSON.stringify(schedule));
    }
    
    if (onSave) {
      onSave(schedule);
    }
    
    setIsSaving(false);
    setSaveMessage('Horarios guardados exitosamente');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleReset = () => {
    const defaultSchedule: DaySchedule[] = [
      { day: 'monday', dayLabel: 'Lunes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      { day: 'tuesday', dayLabel: 'Martes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      { day: 'wednesday', dayLabel: 'Miércoles', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      { day: 'thursday', dayLabel: 'Jueves', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      { day: 'friday', dayLabel: 'Viernes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
      { day: 'saturday', dayLabel: 'Sábado', enabled: true, slots: [{ start: '10:00', end: '16:00' }] },
      { day: 'sunday', dayLabel: 'Domingo', enabled: false, slots: [{ start: '10:00', end: '14:00' }] },
    ];
    setSchedule(defaultSchedule);
    setSaveMessage('Horarios restablecidos a valores predeterminados');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
            Horario de Operación
          </h2>
          <p className="caption text-muted-foreground">
            Configure los días y horarios de atención del salón
          </p>
        </div>
        <Icon name="ClockIcon" size={24} className="text-primary" />
      </div>

      <div className="space-y-4 mb-6">
        {schedule.map((day, dayIndex) => (
          <div
            key={day.day}
            className={`border border-border rounded-lg p-4 transition-smooth ${
              day.enabled ? 'bg-background' : 'bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(dayIndex)}
                  className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    day.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`Toggle ${day.dayLabel}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                      day.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`font-medium ${day.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {day.dayLabel}
                </span>
              </div>
              {day.enabled && day.slots.length < 3 && (
                <button
                  onClick={() => addTimeSlot(dayIndex)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Icon name="PlusIcon" size={16} />
                  <span>Agregar horario</span>
                </button>
              )}
            </div>

            {day.enabled && (
              <div className="space-y-2">
                {day.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'start', e.target.value)}
                        className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'end', e.target.value)}
                        className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    {day.slots.length > 1 && (
                      <button
                        onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                        className="p-2 text-error hover:bg-error/10 rounded-md transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
                        aria-label="Eliminar horario"
                      >
                        <Icon name="TrashIcon" size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {saveMessage && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success" />
          <span className="text-sm text-success font-medium">{saveMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-muted-foreground focus:ring-offset-2"
        >
          Restablecer
        </button>
      </div>
    </div>
  );
};

export default OperatingHoursSection;