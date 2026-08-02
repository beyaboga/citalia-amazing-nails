import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/** GET /api/reports/payment-methods — una fila por método de pago (pagos no anulados). */
export async function GET(request: Request) {
  const auth = await requirePermission('reports.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const employeeId = searchParams.get('employeeId');

  const { rows } = await pool.query(
    `SELECT pm.id, pm.name, COUNT(pd.*)::int AS "transactionCount", SUM(pd.amount)::float8 AS "totalReceived"
       FROM payment_details pd
       JOIN payment_methods pm ON pm.id = pd.payment_method_id
       JOIN payments p ON p.id = pd.payment_id
       JOIN appointments a ON a.id = p.appointment_id
      WHERE p.voided_at IS NULL
        AND ($1::date IS NULL OR p.created_at::date >= $1::date)
        AND ($2::date IS NULL OR p.created_at::date <= $2::date)
        AND ($3::int IS NULL OR a.technician_id = $3)
      GROUP BY pm.id, pm.name
      ORDER BY "totalReceived" DESC`,
    [from || null, to || null, employeeId ? Number(employeeId) : null]
  );

  return NextResponse.json({ rows });
}
