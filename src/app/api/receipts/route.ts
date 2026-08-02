import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/receipts — recibos emitidos, más recientes primero.
 * Con permiso para cobrar (recepcionista y admin pueden consultarlos/reimprimirlos).
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para ver recibos' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT
       r.id,
       r.receipt_number AS "receiptNumber",
       to_char(r.issued_date, 'DD/MM/YYYY HH24:MI') AS "issuedDate",
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
     ORDER BY r.sequence_number DESC`
  );

  return NextResponse.json(rows);
}
