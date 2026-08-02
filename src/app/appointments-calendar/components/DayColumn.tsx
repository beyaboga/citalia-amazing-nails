'use client';

import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  SLOT_MINUTES,
  SLOT_HEIGHT,
  PIXELS_PER_MINUTE,
  STATUS_CONFIG,
  blockGeometry,
  minutesToTime,
  workingSlotsFor,
  unavailableRanges,
  type CalendarAppointment,
  type AvailabilityData,
} from './calendarConstants';

/** Identifica a qué agenda y día pertenece una columna. */
export interface ColumnTarget {
  date: string;
  technicianId: number | null;
  /** Nombre mostrado (para el diálogo de confirmación al mover). */
  title: string;
}

interface DayColumnProps {
  target: ColumnTarget;
  appointments: CalendarAppointment[];
  availability: AvailabilityData | null;
  canDrag: boolean;
  /** Muestra el nombre del técnico dentro del bloque (cuando la columna mezcla técnicos). */
  showTechnicianName: boolean;
  onSlotClick: (target: ColumnTarget, startTime: string) => void;
  onAppointmentClick: (appointment: CalendarAppointment) => void;
  onDragStart: (appointment: CalendarAppointment) => void;
  onDrop: (target: ColumnTarget, startTime: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

const DayColumn = ({
  target,
  appointments,
  availability,
  canDrag,
  showTechnicianName,
  onSlotClick,
  onAppointmentClick,
  onDragStart,
  onDrop,
  className = '',
}: DayColumnProps) => {
  const timeFromOffset = (event: React.MouseEvent | React.DragEvent, element: HTMLElement): string => {
    const rect = element.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const snapped = Math.floor(offsetY / PIXELS_PER_MINUTE / SLOT_MINUTES) * SLOT_MINUTES;
    const clamped = Math.max(0, Math.min(snapped, (DAY_END_HOUR - DAY_START_HOUR) * 60 - SLOT_MINUTES));
    return minutesToTime(DAY_START_HOUR * 60 + clamped);
  };

  const columnAppointments = appointments.filter(
    (appointment) =>
      appointment.date === target.date &&
      (target.technicianId === null || appointment.technicianId === target.technicianId)
  );

  const gaps =
    target.technicianId !== null
      ? unavailableRanges(workingSlotsFor(availability, target.technicianId, target.date))
      : [];

  return (
    <div
      className={`relative ${className}`}
      onClick={(event) => onSlotClick(target, timeFromOffset(event, event.currentTarget))}
      onDragOver={(event) => {
        if (canDrag) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(target, timeFromOffset(event, event.currentTarget));
      }}
    >
      {/* Horas fuera del horario del técnico */}
      {gaps.map((gap) => (
        <div
          key={`${gap.start}-${gap.end}`}
          className="absolute left-0 right-0 pointer-events-none calendar-unavailable"
          style={{
            top: (gap.start - DAY_START_HOUR * 60) * PIXELS_PER_MINUTE,
            height: (gap.end - gap.start) * PIXELS_PER_MINUTE,
          }}
          aria-hidden="true"
        />
      ))}

      {HOURS.map((hour, index) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border pointer-events-none"
          style={{ top: index * 60 * PIXELS_PER_MINUTE }}
        />
      ))}
      {HOURS.slice(0, -1).map((hour, index) => (
        <div
          key={`${hour}-half`}
          className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
          style={{ top: (index * 60 + 30) * PIXELS_PER_MINUTE }}
        />
      ))}

      {columnAppointments.map((appointment) => {
        const { top, height } = blockGeometry(appointment.startTime, appointment.endTime);
        const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
        const isCompact = height < SLOT_HEIGHT * 3;

        return (
          <div
            key={appointment.id}
            draggable={canDrag}
            onDragStart={() => onDragStart(appointment)}
            onClick={(event) => {
              event.stopPropagation();
              onAppointmentClick(appointment);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onAppointmentClick(appointment);
              }
            }}
            className={`absolute left-0.5 right-0.5 rounded px-2 py-1 overflow-hidden transition-smooth hover:shadow-warm-md focus:outline-none focus:ring-2 focus:ring-primary ${
              config.block
            } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
            style={{ top, height }}
            role="button"
            tabIndex={0}
            title={`${appointment.startTime}–${appointment.endTime} · ${appointment.customerName}`}
          >
            <p className="text-xs leading-tight truncate">
              <span className="tabular-nums opacity-80">
                {appointment.startTime} - {appointment.endTime}
              </span>{' '}
              <span className="font-semibold">{appointment.customerName}</span>
            </p>
            {!isCompact && (
              <>
                <p className="text-[11px] leading-tight truncate opacity-75 mt-0.5">
                  {appointment.services.join(' + ') || 'Sin servicios'}
                </p>
                {showTechnicianName && appointment.technicianName && (
                  <p className="text-[11px] leading-tight truncate opacity-60">
                    {appointment.technicianName}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DayColumn;
