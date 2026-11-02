import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/receipts — recibos emitidos, más recientes primero.
 * Con permiso para cobrar (recepcionista y admin pueden consultarlos/reimprimirlos).
 * Incluye los recibos de cobros individuales (`receipts`) y los de cobros combinados
 * (`payment_groups`); `kind` distingue a cuál tabla pertenece cada `id`.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para ver recibos' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT
         r.id,
         'single' AS kind,
         r.sequence_number AS seq,
         r.receipt_number AS "receiptNumber",
         to_char(r.issued_date AT TIME ZONE 'America/Tegucigalpa', 'DD/MM/YYYY HH24:MI') AS "issuedDate",
         to_char(a.appointment_date, 'YYYY-MM-DD') AS "serviceDate",
         c.name AS "customerName",
         p.total_amount::float8 AS "totalAmount",
         p.paid_amount::float8 AS "paidAmount",
         p.payment_status AS "paymentStatus",
         (p.voided_at IS NOT NULL) AS voided,
         cashier.name AS "cashierName"
       FROM receipts r
       JOIN payments p ON p.id = r.payment_id
       JOIN appointments a ON a.id = p.appointment_id
       JOIN customers c ON c.id = p.customer_id
       LEFT JOIN users cashier ON cashier.id = p.created_by
       UNION ALL
       SELECT
         g.id,
         'group' AS kind,
         g.sequence_number AS seq,
         g.receipt_number AS "receiptNumber",
         to_char(g.created_at AT TIME ZONE 'America/Tegucigalpa', 'DD/MM/YYYY HH24:MI') AS "issuedDate",
         (SELECT to_char(MIN(a.appointment_date), 'YYYY-MM-DD')
            FROM payments p JOIN appointments a ON a.id = p.appointment_id
           WHERE p.payment_group_id = g.id) AS "serviceDate",
         c.name AS "customerName",
         g.total_amount::float8 AS "totalAmount",
         g.total_amount::float8 AS "paidAmount",
         'PAID' AS "paymentStatus",
         (g.voided_at IS NOT NULL) AS voided,
         cashier.name AS "cashierName"
       FROM payment_groups g
       JOIN customers c ON c.id = g.customer_id
       LEFT JOIN users cashier ON cashier.id = g.created_by
     ) x
     ORDER BY seq DESC`
  );

  return NextResponse.json(rows);
}
