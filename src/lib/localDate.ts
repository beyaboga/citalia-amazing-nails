/**
 * Fecha local (YYYY-MM-DD) del navegador. `toISOString()` devuelve la fecha UTC, que
 * después de las 6 p.m. en Honduras ya es el día siguiente.
 */
export function toLocalDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
