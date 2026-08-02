import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import type { WhatsAppEvent } from '@/lib/whatsapp';

const EVENTS: WhatsAppEvent[] = ['created', 'rescheduled', 'cancelled'];

/**
 * GET /api/whatsapp-templates — plantillas de los mensajes al cliente.
 *
 * Cualquier usuario autenticado puede leerlas: quien agenda una cita necesita el
 * texto para generar el mensaje, aunque no pueda editarlo.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT event, enabled, body FROM whatsapp_templates ORDER BY event`
  );

  return NextResponse.json(rows);
}

/** PUT /api/whatsapp-templates — guardar el texto de una plantilla. */
export async function PUT(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'settings.manage')) {
    return NextResponse.json(
      { error: 'No tiene permiso para editar la configuración' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const event = String(body?.event ?? '') as WhatsAppEvent;

  if (!EVENTS.includes(event)) {
    return NextResponse.json({ error: 'Mensaje no reconocido' }, { status: 400 });
  }

  const text = String(body?.body ?? '').trim();
  if (!text) {
    return NextResponse.json({ error: 'El mensaje no puede quedar vacío' }, { status: 400 });
  }

  const enabled = Boolean(body?.enabled);

  const { rowCount } = await pool.query(
    `UPDATE whatsapp_templates
        SET body = $1, enabled = $2, updated_by = $3
      WHERE event = $4`,
    [text, enabled, user.id, event]
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Mensaje no reconocido' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
