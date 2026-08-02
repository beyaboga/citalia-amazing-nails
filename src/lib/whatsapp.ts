/**
 * Armado de los mensajes de WhatsApp para las clientas.
 *
 * El texto vive en la tabla `whatsapp_templates` y se edita desde Configuración.
 * Aquí solo se sustituyen las variables y se construye el enlace de envío.
 *
 * El envío es asistido: se abre WhatsApp con el mensaje ya escrito y el negocio
 * lo manda desde su propio número, así la clienta puede responder al chat de
 * siempre. Para pasar a envío automático (API oficial de Meta) basta reemplazar
 * `buildWhatsAppUrl` por una llamada al proveedor: el resto no cambia.
 */

export type WhatsAppEvent = 'created' | 'rescheduled' | 'cancelled';

export interface WhatsAppTemplate {
  event: WhatsAppEvent;
  enabled: boolean;
  body: string;
}

export const WHATSAPP_EVENT_LABELS: Record<WhatsAppEvent, string> = {
  created: 'Cita confirmada',
  rescheduled: 'Cita reprogramada',
  cancelled: 'Cita cancelada',
};

/** Variables disponibles en las plantillas, con un ejemplo para la vista previa. */
export const WHATSAPP_VARIABLES = [
  { key: 'cliente', description: 'Nombre de la clienta', example: 'Bessy' },
  { key: 'fecha', description: 'Fecha de la cita', example: 'sáb, 25 jul' },
  { key: 'hora', description: 'Hora de inicio', example: '11:00 AM' },
  {
    key: 'servicios',
    description: 'Servicios reservados, con su duración',
    example: 'Extensiones de uñas Técnica Hibrida (2 horas 45 minutos)',
  },
  { key: 'duracion', description: 'Duración total de la cita', example: '2 horas 45 minutos' },
  { key: 'profesional', description: 'Quien atiende la cita', example: 'Luisa Fernanda' },
  { key: 'total', description: 'Total a pagar', example: 'L 650' },
] as const;

export type WhatsAppVariables = Record<string, string>;

/** "2 horas 45 minutos" — formato largo, pensado para leerse en un chat. */
export function formatDurationLong(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 minutos';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(hours === 1 ? '1 hora' : `${hours} horas`);
  if (minutes > 0) parts.push(minutes === 1 ? '1 minuto' : `${minutes} minutos`);

  return parts.join(' ');
}

/** "sáb, 25 jul" — el mismo formato corto del mensaje que ya se usaba. */
export function formatDateForMessage(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;

  const date = new Date(year, month - 1, day);
  const text = date.toLocaleDateString('es-HN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  // Intl deja "sáb, 25 jul" o "sáb., 25 jul." según la plataforma: se limpian los
  // puntos de las abreviaturas para que el mensaje salga siempre igual.
  return text.replace(/\./g, '');
}

/**
 * Sustituye {{variable}} por su valor. Una variable desconocida se deja tal cual,
 * para que un error de escritura se note en la vista previa en vez de desaparecer.
 */
export function renderTemplate(body: string, variables: WhatsAppVariables): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    variables[key] !== undefined ? variables[key] : match
  );
}

/** Ejemplo de cada variable, para la vista previa del mantenimiento. */
export function sampleVariables(): WhatsAppVariables {
  return Object.fromEntries(WHATSAPP_VARIABLES.map((v) => [v.key, v.example]));
}

/**
 * Normaliza un teléfono al formato internacional que espera wa.me (solo dígitos).
 * Los números hondureños de 8 dígitos se prefijan con 504; los que ya traen código
 * de país se respetan. Devuelve null si no hay dígitos suficientes para llamar.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 8) return `504${digits}`;
  if (digits.length >= 11) return digits;
  // Menos de 8 dígitos: el número está incompleto y wa.me no podría abrir el chat.
  return null;
}

/** Enlace que abre WhatsApp con el mensaje ya escrito para ese número. */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
