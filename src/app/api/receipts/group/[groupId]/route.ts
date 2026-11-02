import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ groupId: string }> };

/**
 * GET /api/receipts/group/[groupId] — recibo de un cobro combinado para reimprimir:
 * todas las líneas de servicio agrupadas por técnica, con el método de pago usado.
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para ver recibos' }, { status: 403 });
  }

  const { groupId: rawId } = await context.params;
  const groupId = Number(rawId);
  if (!Number.isInteger(groupId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT
       g.id AS "groupId",
       g.receipt_number AS "receiptNumber",
       (SELECT to_char(MIN(a.appointment_date), 'YYYY-MM-DD')
          FROM payments p JOIN appointments a ON a.id = p.appointment_id
         WHERE p.payment_group_id = g.id) AS date,
       c.name AS "customerName",
       g.subtotal::float8 AS subtotal,
       g.discount_amount::float8 AS "discountAmount",
       g.tip_amount::float8 AS "tipAmount",
       g.total_amount::float8 AS "totalAmount",
       g.total_amount::float8 AS "paidAmount",
       0::float8 AS "pendingAmount",
       'PAID' AS "paymentStatus",
       (g.voided_at IS NOT NULL) AS voided,
       g.void_reason AS "voidReason",
       cashier.name AS "cashierName"
     FROM payment_groups g
     JOIN customers c ON c.id = g.customer_id
     LEFT JOIN users cashier ON cashier.id = g.created_by
     WHERE g.id = $1`,
    [groupId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
  }

  const { rows: serviceLines } = await pool.query(
    `SELECT s.id AS "serviceId", s.name, aps.price_at_booking::float8 AS price,
            tech.name AS "technicianName"
     FROM payments p
     JOIN appointments a ON a.id = p.appointment_id
     JOIN appointment_services aps ON aps.appointment_id = a.id
     JOIN services s ON s.id = aps.service_id
     LEFT JOIN users tech ON tech.id = a.technician_id
     WHERE p.payment_group_id = $1
     ORDER BY tech.name, s.name`,
    [groupId]
  );

  const { rows: methods } = await pool.query(
    `SELECT pm.name, SUM(pd.amount)::float8 AS amount, MAX(pd.reference) AS reference
     FROM payments p
     JOIN payment_details pd ON pd.payment_id = p.id
     JOIN payment_methods pm ON pm.id = pd.payment_method_id
     WHERE p.payment_group_id = $1
     GROUP BY pm.name
     ORDER BY pm.name`,
    [groupId]
  );

  return NextResponse.json({ ...rows[0], serviceLines, methods });
}
