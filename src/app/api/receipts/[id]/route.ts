import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * GET /api/receipts/[id] — recibo completo para reimprimir.
 * Devuelve todo lo que necesita el recibo: servicios, montos, métodos y cajero.
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para ver recibos' }, { status: 403 });
  }

  const { id } = await context.params;
  const receiptId = Number(id);
  if (!Number.isInteger(receiptId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT
       r.id,
       p.id AS "paymentId",
       r.receipt_number AS "receiptNumber",
       to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
       c.name AS "customerName",
       p.subtotal::float8 AS subtotal,
       p.discount_amount::float8 AS "discountAmount",
       p.tip_amount::float8 AS "tipAmount",
       p.total_amount::float8 AS "totalAmount",
       p.paid_amount::float8 AS "paidAmount",
       p.payment_status AS "paymentStatus",
       (p.voided_at IS NOT NULL) AS voided,
       p.void_reason AS "voidReason",
       cashier.name AS "cashierName"
     FROM receipts r
     JOIN payments p ON p.id = r.payment_id
     JOIN appointments a ON a.id = p.appointment_id
     JOIN customers c ON c.id = p.customer_id
     LEFT JOIN users cashier ON cashier.id = p.created_by
     WHERE r.id = $1`,
    [receiptId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
  }
  const receipt = rows[0];

  const { rows: serviceLines } = await pool.query(
    `SELECT s.id AS "serviceId", s.name, aps.price_at_booking::float8 AS price
     FROM appointment_services aps
     JOIN services s ON s.id = aps.service_id
     JOIN payments p ON p.appointment_id = aps.appointment_id
     WHERE p.id = $1
     ORDER BY s.name`,
    [receipt.paymentId]
  );

  const { rows: methods } = await pool.query(
    `SELECT pm.name, pd.amount::float8 AS amount, pd.reference
     FROM payment_details pd
     JOIN payment_methods pm ON pm.id = pd.payment_method_id
     WHERE pd.payment_id = $1
     ORDER BY pd.id`,
    [receipt.paymentId]
  );

  return NextResponse.json({
    ...receipt,
    pendingAmount: round2(receipt.totalAmount - receipt.paidAmount),
    serviceLines,
    methods,
  });
}
