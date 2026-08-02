'use client';

import Icon from '@/components/ui/AppIcon';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  dayOfWeek: number;
  dayLabel: string;
  enabled: boolean;
  slots: TimeSlot[];
}

interface ScheduleSectionProps {
  data: DaySchedule[];
  onChange: (data: DaySchedule[]) => void;
}

const ScheduleSection = ({ data, onChange }: ScheduleSectionProps) => {
  const toggleDay = (dayIndex: number) => {
    const next = [...data];
    next[dayIndex] = { ...next[dayIndex], enabled: !next[dayIndex].enabled };
    onChange(next);
  };

  const updateSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string) => {
    const next = [...data];
    const slots = [...next[dayIndex].slots];
    slots[slotIndex] = { ...slots[slotIndex], [field]: value };
    next[dayIndex] = { ...next[dayIndex], slots };
    onChange(next);
  };

  const addSlot = (dayIndex: number) => {
    const next = [...data];
    next[dayIndex] = {
      ...next[dayIndex],
      slots: [...next[dayIndex].slots, { start: '09:00', end: '18:00' }],
    };
    onChange(next);
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const next = [...data];
    if (next[dayIndex].slots.length > 1) {
      next[dayIndex] = { ...next[dayIndex], slots: next[dayIndex].slots.filter((_, i) => i !== slotIndex) };
      onChange(next);
    }
  };

  // Copia las franjas del primer día a los demás, respetando qué días están activos:
  // un día apagado sigue apagado, solo hereda el horario para cuando se encienda.
  const copyFirstDayToRest = () => {
    const [first, ...rest] = data;
    if (!first) return;
    onChange([
      first,
      ...rest.map((day) => ({
        ...day,
        slots: first.slots.map((slot) => ({ ...slot })),
      })),
    ]);
  };

  const firstDay = data[0];
  const restMatchFirstDay =
    firstDay &&
    data.slice(1).every(
      (day) =>
        day.slots.length === firstDay.slots.length &&
        day.slots.every((slot, i) => slot.start === firstDay.slots[i].start && slot.end === firstDay.slots[i].end)
    );

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="ClockIcon" size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-xl font-semibold text-foreground">Horario Semanal</h2>
          <p className="caption text-muted-foreground text-sm">Días y franjas en que puede recibir citas</p>
        </div>
        {firstDay && (
          <button
            type="button"
            onClick={copyFirstDayToRest}
            disabled={restMatchFirstDay}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title={
              restMatchFirstDay
                ? 'Todos los días ya usan el horario del lunes'
                : `Aplicar el horario del ${firstDay.dayLabel.toLowerCase()} a los demás días`
            }
          >
            <Icon name="DocumentDuplicateIcon" size={18} />
            <span className="hidden sm:inline">Copiar {firstDay.dayLabel} a todos</span>
            <span className="sm:hidden">Copiar a todos</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {data.map((day, dayIndex) => (
          <div
            key={day.dayOfWeek}
            className={`border border-border rounded-lg p-4 transition-smooth ${
              day.enabled ? 'bg-background' : 'bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(dayIndex)}
                  className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    day.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`Activar ${day.dayLabel}`}
                  aria-pressed={day.enabled}
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
                  type="button"
                  onClick={() => addSlot(dayIndex)}
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
                        onChange={(e) => updateSlot(dayIndex, slotIndex, 'start', e.target.value)}
                        className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(dayIndex, slotIndex, 'end', e.target.value)}
                        className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    {day.slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(dayIndex, slotIndex)}
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
    </div>
  );
};

export default ScheduleSection;
