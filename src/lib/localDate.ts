/**
 * Fecha local (YYYY-MM-DD) del navegador. `toISOString()` devuelve la fecha UTC, que
 * después de las 6 p.m. en Honduras ya es el día siguiente.
 */
export function toLocalDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' (sin pasar por Date, para no mover el día por zona horaria). */
export function formatDateDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** 'YYYY-MM-DD' → 'Lunes', 'Martes'… (se arma con y/m/d locales para no mover el día por zona horaria). */
export function weekdayName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const name = new Date(y, m - 1, d).toLocaleDateString('es-HN', { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 'HH:MM' (24 h) → 'hh:MM AM/PM'. */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}
