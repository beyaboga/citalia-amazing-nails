import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ groupId: string }> };

/**
 * POST /api/payments/combined/[groupId]/void — anula un cobro combinado: el grupo y
 * todos sus pagos. Cada pago anulado dispara el trigger que revierte las comisiones
 * no liquidadas de su técnica.
 */
export async function POST(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.void')) {
    return NextResponse.json({ error: 'No tiene permiso para anular pagos' }, { status: 403 });
  }

  const { groupId: rawId } = await context.params;
  const groupId = Number(rawId);
  if (!Number.isInteger(groupId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const reason = String(body?.reason ?? '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'Indique el motivo de la anulación' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT voided_at FROM payment_groups WHERE id = $1 FOR UPDATE', [groupId]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Cobro combinado no encontrado' }, { status: 404 });
    }
    if (rows[0].voided_at) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este cobro ya está anulado' }, { status: 400 });
    }

    await client.query(
      `UPDATE payment_groups SET voided_at = now(), voided_by = $1, void_reason = $2 WHERE id = $3`,
      [user.id, reason, groupId]
    );
    // Anular cada pago del grupo (dispara la reversión de comisiones por técnica).
    await client.query(
      `UPDATE payments SET voided_at = now(), voided_by = $1, void_reason = $2
        WHERE payment_group_id = $3 AND voided_at IS NULL`,
      [user.id, reason, groupId]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error voiding combined payment:', error);
    return NextResponse.json({ error: 'No se pudo anular el cobro combinado' }, { status: 500 });
  } finally {
    client.release();
  }
}
