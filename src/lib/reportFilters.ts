/** Presets de rango de fechas compartidos por los reportes. Sin depender de "hoy" salvo el propio preset. */

export type DateRangePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  TODAY: 'Hoy',
  WEEK: 'Esta semana',
  MONTH: 'Este mes',
  LAST_MONTH: 'Mes anterior',
  CUSTOM: 'Rango personalizado',
};

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Lunes de la semana de `ref` (semana inicia lunes). */
function startOfWeek(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay(); // 0=domingo..6=sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function today(ref: Date = new Date()): { from: string; to: string } {
  return { from: fmt(ref), to: fmt(ref) };
}

export function thisWeek(ref: Date = new Date()): { from: string; to: string } {
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: fmt(start), to: fmt(end) };
}

export function thisMonth(ref: Date = new Date()): { from: string; to: string } {
  return { from: fmt(new Date(ref.getFullYear(), ref.getMonth(), 1)), to: fmt(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)) };
}

export function lastMonth(ref: Date = new Date()): { from: string; to: string } {
  return { from: fmt(new Date(ref.getFullYear(), ref.getMonth() - 1, 1)), to: fmt(new Date(ref.getFullYear(), ref.getMonth(), 0)) };
}

export function rangeForPreset(preset: DateRangePreset, custom: { from: string; to: string }): { from: string; to: string } {
  switch (preset) {
    case 'TODAY':
      return today();
    case 'WEEK':
      return thisWeek();
    case 'MONTH':
      return thisMonth();
    case 'LAST_MONTH':
      return lastMonth();
    case 'CUSTOM':
    default:
      return custom;
  }
}
