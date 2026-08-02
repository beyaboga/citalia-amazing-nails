export const MAX_DURATION_MINUTES = 720; // 12 horas

export const DURATION_OPTIONS: number[] = Array.from(
  { length: MAX_DURATION_MINUTES / 5 },
  (_, i) => (i + 1) * 5
);

export function formatDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;

  if (remainder === 0) return `${hours} h`;
  return `${hours} h y ${remainder} min`;
}
