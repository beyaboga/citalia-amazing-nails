import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/cash-deliveries/pending?employeeId=
 *
 * Pagos PAID, no anulados, aún no entregados, de las citas de esa empleada (o de
 * TODAS si no se envía employeeId — usado por la pestaña "Pendientes"/dashboard).
 * "Pendiente" no distingue método: cualquier dinero (efectivo, transferencia, POS)
 * que la empleada haya cobrado directamente cuenta hasta que se entregue.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('cash.deliveries.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  if (employeeId) {
    const { rows } = await pool.query(
      `SELECT p.id AS "paymentId", a.id AS "appointmentId",
              to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
              c.name AS "customerName",
              COALESCE(string_agg(DISTINCT s.name, ', '), '') AS services,
              (p.subtotal - p.discount_amount + p.tip_amount)::float8 AS total
         FROM payments p
         JOIN appointments a ON a.id = p.appointment_id
         JOIN customers c ON c.id = p.customer_id
         JOIN team_members tm ON tm.user_id = a.technician_id
         LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
         LEFT JOIN services s ON s.id = aps.service_id
        WHERE tm.id = $1
          AND p.payment_status = 'PAID' AND p.voided_at IS NULL AND NOT p.is_delivered
        GROUP BY p.id, a.id, a.appointment_date, c.name
        ORDER BY a.appointment_date, a.id`,
      [Number(employeeId)]
    );

    if (rows.length === 0) return NextResponse.json([]);

    const paymentIds = rows.map((r) => r.paymentId);
    const { rows: details } = await pool.query(
      `SELECT pd.payment_id AS "paymentId", pd.payment_method_id AS "paymentMethodId",
              pm.name AS "methodName", pd.amount::float8 AS amount
         FROM payment_details pd
         JOIN payment_methods pm ON pm.id = pd.payment_method_id
        WHERE pd.payment_id = ANY($1)
        ORDER BY pd.id`,
      [paymentIds]
    );
    const methodsByPayment = new Map<number, typeof details>();
    for (const d of details) {
      if (!methodsByPayment.has(d.paymentId)) methodsByPayment.set(d.paymentId, []);
      methodsByPayment.get(d.paymentId)!.push(d);
    }

    const result = rows.map((r) => ({ ...r, methods: methodsByPayment.get(r.paymentId) ?? [] }));
    return NextResponse.json(result);
  }

  // Sin employeeId: resumen por empleada (pestaña "Pendientes" / dashboard).
  const { rows } = await pool.query(
    `SELECT tm.id AS "employeeId", u.name AS "employeeName",
            COUNT(DISTINCT p.id)::int AS "paymentCount",
            COALESCE(SUM(p.subtotal - p.discount_amount + p.tip_amount), 0)::float8 AS total
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       JOIN appointments a ON a.technician_id = tm.user_id
       JOIN payments p ON p.appointment_id = a.id
            AND p.payment_status = 'PAID' AND p.voided_at IS NULL AND NOT p.is_delivered
      GROUP BY tm.id, u.name
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY total DESC`
  );

  if (rows.length === 0) return NextResponse.json([]);

  const { rows: byMethod } = await pool.query(
    `SELECT tm.id AS "employeeId", pd.payment_method_id AS "paymentMethodId",
            pm.name AS "methodName", SUM(pd.amount)::float8 AS amount
       FROM team_members tm
       JOIN appointments a ON a.technician_id = tm.user_id
       JOIN payments p ON p.appointment_id = a.id
            AND p.payment_status = 'PAID' AND p.voided_at IS NULL AND NOT p.is_delivered
       JOIN payment_details pd ON pd.payment_id = p.id
       JOIN payment_methods pm ON pm.id = pd.payment_method_id
      GROUP BY tm.id, pd.payment_method_id, pm.name`
  );
  const methodsByEmployee = new Map<number, typeof byMethod>();
  for (const m of byMethod) {
    if (!methodsByEmployee.has(m.employeeId)) methodsByEmployee.set(m.employeeId, []);
    methodsByEmployee.get(m.employeeId)!.push(m);
  }

  const result = rows.map((r) => ({ ...r, byMethod: methodsByEmployee.get(r.employeeId) ?? [] }));
  return NextResponse.json(result);
}
