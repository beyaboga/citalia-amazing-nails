import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/[id]/void — anula un pago (auditado).
 *
 * No borra nada: marca voided_at/voided_by/void_reason. El recibo se conserva. Al
 * quedar anulado, el índice de "un pago vigente por cita" libera la cita para poder
 * cobrarla de nuevo. No se toca el estado de la cita: eso queda a criterio del admin.
 */
export async function POST(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.void')) {
    return NextResponse.json({ error: 'No tiene permiso para anular pagos' }, { status: 403 });
  }

  const { id } = await context.params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const reason = String(body?.reason ?? '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'Indique el motivo de la anulación' }, { status: 400 });
  }

  const { rows } = await pool.query(
    'SELECT voided_at FROM payments WHERE id = $1',
    [paymentId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }
  if (rows[0].voided_at) {
    return NextResponse.json({ error: 'Este pago ya está anulado' }, { status: 400 });
  }

  await pool.query(
    `UPDATE payments SET voided_at = now(), voided_by = $1, void_reason = $2 WHERE id = $3`,
    [user.id, reason, paymentId]
  );

  return NextResponse.json({ success: true });
}
