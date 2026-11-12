import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Recalcula comisiones PENDIENTES cuyo empleado ya no coincide con el técnico
 * actual de la cita (p. ej. se pagó con la técnica equivocada y luego se
 * corrigió la cita). Borra la comisión mal asignada y la regenera con el
 * técnico correcto usando generate_commissions_for_payment().
 * Nunca toca comisiones aprobadas, pagadas ni ligadas a un payout.
 */
export async function POST() {
  const auth = await requirePermission('commissions.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Comisiones pendientes cuyo empleado != técnico actual de la cita.
    const { rows: stale } = await client.query(
      `SELECT ce.id, p.id AS payment_id
         FROM commission_entries ce
         LEFT JOIN appointment_services aps ON aps.id = ce.appointment_service_id
         JOIN appointments a ON a.id = COALESCE(aps.appointment_id, ce.appointment_id)
         JOIN team_members tm ON tm.id = ce.team_member_id
         JOIN payments p ON p.appointment_id = a.id
                        AND p.payment_status::text = 'PAID' AND p.voided_at IS NULL
        WHERE ce.status::text = 'pending'
          AND ce.payout_id IS NULL
          AND tm.user_id IS DISTINCT FROM a.technician_id`
    );

    const entryIds = stale.map((r) => r.id as number);
    const paymentIds = Array.from(new Set(stale.map((r) => r.payment_id as number)));

    if (entryIds.length > 0) {
      await client.query('DELETE FROM commission_entries WHERE id = ANY($1::int[])', [entryIds]);
      for (const paymentId of paymentIds) {
        await client.query('SELECT generate_commissions_for_payment($1)', [paymentId]);
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ removed: entryIds.length, appointmentsRecalculated: paymentIds.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('recalculate commissions error', e);
    return NextResponse.json({ error: 'No se pudieron recalcular las comisiones' }, { status: 500 });
  } finally {
    client.release();
  }
}
