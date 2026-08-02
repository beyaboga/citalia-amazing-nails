'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { STATUS_CONFIG, toIsoDate, type CalendarAppointment } from './calendarConstants';

interface CalendarMonthProps {
  /** Todos los días de la cuadrícula (lunes de la 1ª semana … domingo de la última). */
  dates: Date[];
  /** Mes que se está mostrando (0–11); los días de otros meses se ven atenuados. */
  currentMonth: number;
  appointments: CalendarAppointment[];
  onAppointmentClick: (appointment: CalendarAppointment) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_VISIBLE = 3;

const CalendarMonth = ({ dates, currentMonth, appointments, onAppointmentClick }: CalendarMonthProps) => {
  const [dayDetail, setDayDetail] = useState<string | null>(null);
  const todayIso = toIsoDate(new Date());

  // Citas por día (fecha ISO), ordenadas por hora.
  const byDay = new Map<string, CalendarAppointment[]>();
  for (const appointment of appointments) {
    const list = byDay.get(appointment.date) ?? [];
    list.push(appointment);
    byDay.set(appointment.date, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const detailAppointments = dayDetail ? byDay.get(dayDetail) ?? [] : [];

  const chip = (appointment: CalendarAppointment) => {
    const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
    return (
      <button
        key={appointment.id}
        onClick={(event) => {
          event.stopPropagation();
          onAppointmentClick(appointment);
        }}
        className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate transition-smooth hover:shadow-warm ${config.block}`}
        title={`${appointment.startTime} · ${appointment.customerName}`}
      >
        <span className="tabular-nums opacity-80">{appointment.startTime}</span>{' '}
        <span className="font-medium">{appointment.customerName}</span>
      </button>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      {/* Encabezado de días de la semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center caption text-xs font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Cuadrícula del mes */}
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const iso = toIsoDate(date);
          const inMonth = date.getMonth() === currentMonth;
          const isToday = iso === todayIso;
          const dayAppointments = byDay.get(iso) ?? [];
          const visible = dayAppointments.slice(0, MAX_VISIBLE);
          const extra = dayAppointments.length - visible.length;

          return (
            <div
              key={iso}
              className={`min-h-[112px] border-b border-r border-border p-1.5 flex flex-col gap-1 ${
                inMonth ? 'bg-card' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs tabular-nums w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map(chip)}
                {extra > 0 && (
                  <button
                    onClick={() => setDayDetail(iso)}
                    className="text-left px-1.5 text-[11px] font-medium text-primary hover:underline"
                  >
                    +{extra} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle del día (al pulsar "+N más") */}
      {dayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDayDetail(null)} />
          <div className="relative bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold text-foreground tabular-nums">
                {dayDetail.split('-').reverse().join('/')}
              </h3>
              <button onClick={() => setDayDetail(null)} className="p-2 rounded-lg hover:bg-muted transition-smooth" aria-label="Cerrar">
                <Icon name="XMarkIcon" size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {detailAppointments.map((appointment) => {
                const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
                return (
                  <button
                    key={appointment.id}
                    onClick={() => {
                      setDayDetail(null);
                      onAppointmentClick(appointment);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 transition-smooth hover:shadow-warm ${config.block}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{appointment.customerName}</span>
                      <span className="text-xs tabular-nums opacity-80">
                        {appointment.startTime}–{appointment.endTime}
                      </span>
                    </div>
                    <p className="text-xs opacity-75 truncate">{appointment.services.join(' + ') || 'Sin servicios'}</p>
                    {appointment.technicianName && (
                      <p className="text-[11px] opacity-60 truncate">{appointment.technicianName}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarMonth;
