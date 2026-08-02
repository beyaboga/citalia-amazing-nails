'use client';

import { useRef } from 'react';
import {
  initialsOf,
  avatarColors,
  DAY_LABELS,
  MONTH_LABELS,
  type CalendarAppointment,
  type CalendarTechnician,
  type AvailabilityData,
} from './calendarConstants';
import { type ColumnTarget } from './DayColumn';
import MatrixDayCell from './MatrixDayCell';

interface CalendarMatrixProps {
  /** Filas = técnicos; columnas = días del rango. */
  technicians: CalendarTechnician[];
  dates: string[];
  appointments: CalendarAppointment[];
  availability: AvailabilityData | null;
  canDrag: boolean;
  onSlotClick: (target: ColumnTarget, startTime: string) => void;
  onAppointmentClick: (appointment: CalendarAppointment) => void;
  onAppointmentDrop: (appointment: CalendarAppointment, target: ColumnTarget, startTime: string) => void;
}

const AVATAR_COL = 'w-28';

function dayHeader(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return { label: DAY_LABELS[weekday], sub: `${day} ${MONTH_LABELS[month - 1].slice(0, 3)}` };
}

/**
 * Vistas 3 días / semana: cada técnico es una fila con su avatar a la izquierda;
 * dentro, una columna por día que lista sus citas (hora + cliente) de forma compacta.
 * Al arrastrar una cita a otra celda se mueve a ese técnico/día conservando la hora.
 */
const CalendarMatrix = ({
  technicians,
  dates,
  appointments,
  availability,
  canDrag,
  onSlotClick,
  onAppointmentClick,
  onAppointmentDrop,
}: CalendarMatrixProps) => {
  const draggedRef = useRef<CalendarAppointment | null>(null);

  const rows =
    technicians.length > 0
      ? technicians
      : [{ userId: -1, name: 'Sin técnicos', jobTitle: null, colorHex: null }];

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Encabezado de días */}
          <div className="flex sticky top-0 z-20 bg-card border-b border-border">
            <div className={`${AVATAR_COL} flex-shrink-0 sticky left-0 z-10 bg-card`} />
            {dates.map((date) => {
              const header = dayHeader(date);
              return (
                <div key={date} className="flex-1 min-w-[160px] px-3 py-3 border-l border-border text-center">
                  <p className="font-medium text-sm text-foreground capitalize">
                    <span className="text-muted-foreground tabular-nums mr-1">{header.sub.split(' ')[0]}</span>
                    {header.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Una fila por técnico */}
          {rows.map((technician, rowIndex) => {
            const colors = avatarColors(technician.name, technician.colorHex);
            const technicianId = technician.userId >= 0 ? technician.userId : null;
            return (
              <div
                key={technician.userId}
                className={`flex items-stretch ${rowIndex > 0 ? 'border-t border-border' : ''}`}
              >
                {/* Avatar del técnico, fijo al hacer scroll horizontal */}
                <div
                  className={`${AVATAR_COL} flex-shrink-0 sticky left-0 z-10 bg-card flex flex-col items-center justify-center gap-2 px-2 py-3 border-r border-border`}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold border-2"
                    style={{ backgroundColor: colors.bg, borderColor: colors.ring, color: colors.text }}
                    aria-hidden="true"
                  >
                    {initialsOf(technician.name)}
                  </div>
                  <p className="font-medium text-xs text-foreground text-center leading-tight">{technician.name}</p>
                </div>

                {/* Un día por columna, como lista compacta */}
                {dates.map((date) => (
                  <MatrixDayCell
                    key={date}
                    target={{ date, technicianId, title: technician.name }}
                    appointments={appointments}
                    availability={availability}
                    canDrag={canDrag}
                    onSlotClick={onSlotClick}
                    onAppointmentClick={onAppointmentClick}
                    onDragStart={(appointment) => {
                      draggedRef.current = appointment;
                    }}
                    onDrop={(dropTarget) => {
                      const appointment = draggedRef.current;
                      if (!appointment) return;
                      // En la lista no hay eje de horas: se conserva la hora original.
                      onAppointmentDrop(appointment, dropTarget, appointment.startTime);
                      draggedRef.current = null;
                    }}
                    className="flex-1 min-w-[160px] border-l border-border"
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarMatrix;
