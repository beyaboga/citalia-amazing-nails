'use client';

import Icon from '@/components/ui/AppIcon';
import {
  DAY_START_HOUR,
  STATUS_CONFIG,
  workingSlotsFor,
  type CalendarAppointment,
  type AvailabilityData,
} from './calendarConstants';
import type { ColumnTarget } from './DayColumn';

interface MatrixDayCellProps {
  target: ColumnTarget;
  appointments: CalendarAppointment[];
  availability: AvailabilityData | null;
  canDrag: boolean;
  onSlotClick: (target: ColumnTarget, startTime: string) => void;
  onAppointmentClick: (appointment: CalendarAppointment) => void;
  onDragStart: (appointment: CalendarAppointment) => void;
  onDrop: (target: ColumnTarget) => void;
  className?: string;
}

/**
 * Celda de la matriz (3 días / semana): la agenda de un técnico en un día, como una
 * LISTA compacta de citas (hora + cliente), no una rejilla de horas. Más legible para
 * comparar a todo el equipo a lo largo de varios días. Los días sin horario del
 * técnico se marcan con el rayado de "no atiende".
 */
const MatrixDayCell = ({
  target,
  appointments,
  availability,
  canDrag,
  onSlotClick,
  onAppointmentClick,
  onDragStart,
  onDrop,
  className = '',
}: MatrixDayCellProps) => {
  const list = appointments
    .filter(
      (a) => a.date === target.date && (target.technicianId === null || a.technicianId === target.technicianId)
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const slots = target.technicianId !== null ? workingSlotsFor(availability, target.technicianId, target.date) : [];
  const closed = target.technicianId !== null && slots.length === 0;
  const defaultStart = slots[0]?.start ?? `${String(DAY_START_HOUR).padStart(2, '0')}:00`;

  return (
    <div
      className={`min-h-[88px] p-1.5 space-y-1 ${closed ? 'calendar-unavailable' : ''} ${className}`}
      onClick={() => onSlotClick(target, defaultStart)}
      onDragOver={(event) => {
        if (canDrag) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(target);
      }}
    >
      {list.map((appointment) => {
        const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
        return (
          <button
            key={appointment.id}
            type="button"
            draggable={canDrag}
            onDragStart={() => onDragStart(appointment)}
            onClick={(event) => {
              event.stopPropagation();
              onAppointmentClick(appointment);
            }}
            title={`${appointment.startTime}–${appointment.endTime} · ${appointment.customerName}`}
            className={`w-full text-left rounded px-2 py-1 flex items-center gap-1.5 overflow-hidden transition-smooth hover:shadow-warm-md focus:outline-none focus:ring-2 focus:ring-primary ${
              config.block
            } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
          >
            <span className="text-xs leading-tight truncate flex-1">
              <span className="tabular-nums opacity-80">
                {appointment.startTime} - {appointment.endTime}
              </span>{' '}
              <span className="font-semibold">{appointment.customerName}</span>
            </span>
            <Icon name="TagIcon" variant="solid" size={12} className="opacity-60 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

export default MatrixDayCell;
