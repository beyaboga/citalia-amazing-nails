import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/tips — propinas registradas, con cuánto se ha distribuido de cada una.
 * Solo con permiso para distribuir propinas.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'tips.distribute')) {
    return NextResponse.json({ error: 'No tiene permiso para ver propinas' }, { status: 403 });
  }

  // ?status=pending limita a las que faltan por distribuir; ?from&?to acotan por
  // la fecha de la cita (rango, p. ej. mensual).
  const url = new URL(request.url);
  const onlyPending = url.searchParams.get('status') === 'pending';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const conditions: string[] = [];
  const params: any[] = [];
  if (onlyPending) conditions.push("t.status = 'PENDING_DISTRIBUTION'");
  if (from) {
    params.push(from);
    conditions.push(`a.appointment_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`a.appointment_date <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.appointment_id AS "appointmentId",
       to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
       c.name AS "customerName",
       t.amount::float8 AS amount,
       t.received_by AS "receivedBy",
       t.status,
       COALESCE(d.distributed, 0)::float8 AS distributed
     FROM appointment_tips t
     JOIN appointments a ON a.id = t.appointment_id
     JOIN customers c ON c.id = a.customer_id
     LEFT JOIN (
       SELECT appointment_tip_id, SUM(amount) AS distributed
       FROM tip_distribution GROUP BY appointment_tip_id
     ) d ON d.appointment_tip_id = t.id
     ${where}
     ORDER BY (t.status = 'PENDING_DISTRIBUTION') DESC, a.appointment_date DESC, t.id DESC`,
    params
  );

  return NextResponse.json(rows);
}
