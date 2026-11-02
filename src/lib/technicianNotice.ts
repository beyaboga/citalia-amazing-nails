import {
  buildWhatsAppUrl,
  formatDateForMessage,
  renderTemplate,
  type WhatsAppTemplate,
} from '@/lib/whatsapp';

export interface TechnicianNotice {
  technicianName: string;
  message: string;
  /** null cuando la estilista no tiene un teléfono válido: solo se puede copiar el texto. */
  url: string | null;
}

interface TechnicianNoticeInput {
  technicianId: number;
  /** Quien está agendando; si es la misma estilista no hay nada que avisar. */
  creator: { id: number; name: string };
  customerName: string;
  date: string;
  /** 'hh:MM AM/PM', ya formateada para el mensaje. */
  timeLabel: string;
  serviceNames: string[];
}

/**
 * Arma el aviso para la estilista a la que le agendaron una cita. Devuelve null cuando
 * no hay nada que ofrecer: la agendó ella misma, el mensaje está apagado en
 * Configuración o no se pudo leer. Nunca lanza: avisar es un extra y no debe impedir
 * guardar la cita.
 */
export async function prepareTechnicianNotice(
  input: TechnicianNoticeInput
): Promise<TechnicianNotice | null> {
  if (input.technicianId === input.creator.id) return null;

  try {
    const [templatesRes, teamRes] = await Promise.all([
      fetch('/api/whatsapp-templates'),
      fetch('/api/team-members'),
    ]);
    if (!templatesRes.ok || !teamRes.ok) return null;

    const templates: WhatsAppTemplate[] = await templatesRes.json();
    const template = templates.find((t) => t.event === 'technician');
    if (!template?.enabled) return null;

    const team: { userId: number; name: string; phone: string | null }[] = await teamRes.json();
    const technician = team.find((m) => m.userId === input.technicianId);
    if (!technician) return null;

    const message = renderTemplate(template.body, {
      profesional: technician.name.split(' ')[0],
      cliente: input.customerName,
      fecha: formatDateForMessage(input.date),
      hora: input.timeLabel,
      servicios: input.serviceNames.join(', '),
      agendada_por: input.creator.name.split(' ')[0],
    });

    return {
      technicianName: technician.name,
      message,
      url: buildWhatsAppUrl(technician.phone, message),
    };
  } catch {
    return null;
  }
}
