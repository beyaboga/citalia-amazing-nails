export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
export const SLOT_MINUTES = 15;
/** Alto en píxeles de cada bloque de SLOT_MINUTES. Define la escala vertical. */
export const SLOT_HEIGHT = 16;

export const MINUTES_PER_DAY = (DAY_END_HOUR - DAY_START_HOUR) * 60;
export const PIXELS_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES;
export const GRID_HEIGHT = MINUTES_PER_DAY * PIXELS_PER_MINUTE;

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'inactive';

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; chip: string; block: string; dot: string }
> = {
  pending: {
    label: 'Pendiente',
    chip: 'bg-warning/10 text-warning border-warning/30',
    block: 'bg-warning/15 border-l-4 border-warning text-foreground',
    dot: 'bg-warning',
  },
  confirmed: {
    label: 'Confirmada',
    chip: 'bg-primary/10 text-primary border-primary/30',
    block: 'bg-primary/15 border-l-4 border-primary text-foreground',
    dot: 'bg-primary',
  },
  in_progress: {
    label: 'En proceso',
    chip: 'bg-accent/20 text-accent-foreground border-accent/40',
    block: 'bg-accent/25 border-l-4 border-accent text-foreground',
    dot: 'bg-accent',
  },
  completed: {
    label: 'Finalizada',
    chip: 'bg-success/10 text-success border-success/30',
    block: 'bg-success/15 border-l-4 border-success text-foreground',
    dot: 'bg-success',
  },
  cancelled: {
    label: 'Cancelada',
    chip: 'bg-error/10 text-error border-error/30',
    block: 'bg-error/10 border-l-4 border-error text-muted-foreground line-through',
    dot: 'bg-error',
  },
  no_show: {
    label: 'No asistió',
    chip: 'bg-muted text-muted-foreground border-border',
    block: 'bg-muted border-l-4 border-muted-foreground/50 text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  inactive: {
    label: 'Inactiva',
    chip: 'bg-muted text-muted-foreground border-border',
    block: 'bg-muted border-l-4 border-border text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

export interface CalendarAppointment {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  technicianId: number | null;
  technicianName: string | null;
  technicianColor: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  durationMinutes: number;
  totalPrice: number;
  notes: string | null;
  services: string[];
}

export interface CalendarTechnician {
  userId: number;
  name: string;
  jobTitle: string | null;
  colorHex: string | null;
}

/** 'HH:MM' → minutos desde medianoche. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Posición vertical y alto en píxeles de una cita dentro de la rejilla. */
export function blockGeometry(startTime: string, endTime: string) {
  const startMinutes = timeToMinutes(startTime) - DAY_START_HOUR * 60;
  const endMinutes = timeToMinutes(endTime) - DAY_START_HOUR * 60;
  return {
    top: startMinutes * PIXELS_PER_MINUTE,
    height: Math.max((endMinutes - startMinutes) * PIXELS_PER_MINUTE, SLOT_HEIGHT),
  };
}

export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Lunes de la semana a la que pertenece la fecha dada. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export interface ScheduleSlot {
  start: string;
  end: string;
}

export interface TechnicianSchedule {
  userId: number;
  dayOfWeek: number;
  enabled: boolean;
  slots: ScheduleSlot[];
}

export interface TimeOffPeriod {
  userId: number;
  startDate: string;
  endDate: string;
  type: string;
}

export interface ClosedDay {
  date: string;
  reason: string;
}

export interface AvailabilityData {
  schedules: TechnicianSchedule[];
  timeOff: TimeOffPeriod[];
  closedDays: ClosedDay[];
}

/**
 * Franjas en que un técnico SÍ atiende ese día concreto.
 *
 * Devuelve [] cuando no trabaja: día apagado en su horario, de vacaciones, o
 * el salón cerrado. El calendario sombrea todo lo que quede fuera de estas franjas.
 */
export function workingSlotsFor(
  availability: AvailabilityData | null,
  technicianId: number | null,
  isoDate: string
): ScheduleSlot[] {
  if (!availability || technicianId === null) return [];

  if (availability.closedDays.some((day) => day.date === isoDate)) return [];

  const isOnLeave = availability.timeOff.some(
    (period) =>
      period.userId === technicianId && isoDate >= period.startDate && isoDate <= period.endDate
  );
  if (isOnLeave) return [];

  // El día de la semana se calcula partiendo la fecha ISO, no con new Date(iso),
  // porque eso último la interpreta en UTC y puede correr el día.
  const [year, month, day] = isoDate.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const schedule = availability.schedules.find(
    (entry) => entry.userId === technicianId && entry.dayOfWeek === dayOfWeek
  );

  if (!schedule || !schedule.enabled) return [];
  return schedule.slots;
}

/** Tramos NO laborables dentro del rango visible, para pintarlos sombreados. */
export function unavailableRanges(slots: ScheduleSlot[]): { start: number; end: number }[] {
  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = DAY_END_HOUR * 60;

  if (slots.length === 0) return [{ start: dayStart, end: dayEnd }];

  const sorted = [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  const gaps: { start: number; end: number }[] = [];
  let cursor = dayStart;

  for (const slot of sorted) {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    if (slotStart > cursor) gaps.push({ start: cursor, end: Math.min(slotStart, dayEnd) });
    cursor = Math.max(cursor, slotEnd);
  }

  if (cursor < dayEnd) gaps.push({ start: cursor, end: dayEnd });
  return gaps.filter((gap) => gap.end > gap.start);
}

/** Iniciales para el avatar del encabezado: "Luisa Fernanda Alvarador" → "LA". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Colores suaves y estables para el avatar, derivados del nombre. */
const AVATAR_PALETTE = [
  { bg: '#FDE8D7', ring: '#F0A868', text: '#8A4B14' },
  { bg: '#D8EEF5', ring: '#6FB6CE', text: '#155A6E' },
  { bg: '#E8E2F7', ring: '#A48FD8', text: '#4A3480' },
  { bg: '#DFF0E3', ring: '#7CBF92', text: '#1F5C34' },
  { bg: '#FBE1EA', ring: '#E390AC', text: '#88274A' },
];

export function avatarColors(name: string, override?: string | null) {
  if (override) return { bg: `${override}22`, ring: override, text: override };
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
