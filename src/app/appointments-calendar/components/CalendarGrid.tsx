'use client';

import { useRef } from 'react';
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  GRID_HEIGHT,
  PIXELS_PER_MINUTE,
  formatTimeLabel,
  initialsOf,
  avatarColors,
  type CalendarAppointment,
  type CalendarTechnician,
  type AvailabilityData,
} from './calendarConstants';
import DayColumn, { type ColumnTarget } from './DayColumn';

interface CalendarGridProps {
  /** Técnicos visibles: una columna por cada uno. */
  technicians: CalendarTechnician[];
  date: string;
  appointments: CalendarAppointment[];
  availability: AvailabilityData | null;
  canDrag: boolean;
  onSlotClick: (target: ColumnTarget, startTime: string) => void;
  onAppointmentClick: (appointment: CalendarAppointment) => void;
  onAppointmentDrop: (appointment: CalendarAppointment, target: ColumnTarget, startTime: string) => void;
}

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

/**
 * Vista día: columnas = técnicos, una fecha. Cada columna muestra la agenda de
 * un técnico con su avatar en el encabezado.
 */
const CalendarGrid = ({
  technicians,
  date,
  appointments,
  availability,
  canDrag,
  onSlotClick,
  onAppointmentClick,
  onAppointmentDrop,
}: CalendarGridProps) => {
  const draggedRef = useRef<CalendarAppointment | null>(null);

  const columns: (ColumnTarget & { accentColor: string | null; subtitle?: string })[] =
    technicians.length > 0
      ? technicians.map((technician) => ({
          date,
          technicianId: technician.userId,
          title: technician.name,
          subtitle: technician.jobTitle ?? undefined,
          accentColor: technician.colorHex,
        }))
      : [{ date, technicianId: null, title: 'Sin técnicos', accentColor: null }];

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Encabezado con avatares */}
          <div className="flex sticky top-0 z-20 bg-card border-b border-border">
            <div className="w-16 flex-shrink-0" />
            {columns.map((column) => {
              const colors = avatarColors(column.title, column.accentColor);
              return (
                <div
                  key={column.technicianId ?? 'none'}
                  className="flex-1 min-w-[180px] px-3 py-4 flex flex-col items-center gap-2"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold border-2"
                    style={{ backgroundColor: colors.bg, borderColor: colors.ring, color: colors.text }}
                    aria-hidden="true"
                  >
                    {initialsOf(column.title)}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-foreground truncate max-w-[160px]">
                      {column.title}
                    </p>
                    {column.subtitle && (
                      <p className="caption text-xs text-muted-foreground truncate">{column.subtitle}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rejilla */}
          <div className="flex relative" style={{ height: GRID_HEIGHT }}>
            <div className="w-16 flex-shrink-0 relative">
              {HOURS.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 caption text-xs text-muted-foreground tabular-nums"
                  style={{ top: index * 60 * PIXELS_PER_MINUTE }}
                >
                  {formatTimeLabel(`${String(hour).padStart(2, '0')}:00`)}
                </div>
              ))}
            </div>

            {columns.map((column) => (
              <DayColumn
                key={column.technicianId ?? 'none'}
                target={column}
                appointments={appointments}
                availability={availability}
                canDrag={canDrag}
                showTechnicianName={false}
                onSlotClick={onSlotClick}
                onAppointmentClick={onAppointmentClick}
                onDragStart={(appointment) => {
                  draggedRef.current = appointment;
                }}
                onDrop={(target, startTime) => {
                  const appointment = draggedRef.current;
                  if (!appointment) return;
                  onAppointmentDrop(appointment, target, startTime);
                  draggedRef.current = null;
                }}
                className="flex-1 min-w-[180px] border-l border-border"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
