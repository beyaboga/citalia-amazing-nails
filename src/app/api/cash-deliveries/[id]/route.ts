import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/cash-deliveries/[id] — detalle completo: cabecera, totales por método
 * y todas las citas incluidas (cliente, fecha, servicio, referencia, monto).
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission('cash.deliveries.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const deliveryId = Number(id);
  if (!Number.isInteger(deliveryId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const [header, methodTotals, lines] = await Promise.all([
    pool.query(
      `SELECT cd.id, u.name AS "employeeName", rb.name AS "receivedByName",
              to_char(cd.delivery_date, 'YYYY-MM-DD HH24:MI') AS "deliveryDate",
              cd.system_amount::float8 AS "systemAmount",
              cd.received_amount::float8 AS "receivedAmount",
              cd.difference::float8 AS difference,
              cd.notes
         FROM cash_deliveries cd
         JOIN team_members tm ON tm.id = cd.employee_id
         JOIN users u ON u.id = tm.user_id
         LEFT JOIN users rb ON rb.id = cd.received_by_user_id
        WHERE cd.id = $1`,
      [deliveryId]
    ),
    pool.query(
      `SELECT pm.id AS "paymentMethodId", pm.name AS "methodName",
              t.system_amount::float8 AS "systemAmount",
              t.received_amount::float8 AS "receivedAmount",
              t.difference::float8 AS difference
         FROM cash_delivery_method_totals t
         JOIN payment_methods pm ON pm.id = t.payment_method_id
        WHERE t.cash_delivery_id = $1
        ORDER BY pm.display_order`,
      [deliveryId]
    ),
    pool.query(
      `SELECT c.name AS "customerName",
              to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
              COALESCE(string_agg(DISTINCT s.name, ', '), '') AS service,
              pm.name AS "methodName", pd.reference,
              cdd.expected_amount::float8 AS amount
         FROM cash_delivery_details cdd
         JOIN appointments a ON a.id = cdd.appointment_id
         JOIN customers c ON c.id = a.customer_id
         JOIN payment_methods pm ON pm.id = cdd.payment_method_id
         LEFT JOIN payment_details pd ON pd.id = cdd.payment_detail_id
         LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
         LEFT JOIN services s ON s.id = aps.service_id
        WHERE cdd.cash_delivery_id = $1
        GROUP BY c.name, a.appointment_date, pm.name, pd.reference, cdd.expected_amount, cdd.id
        ORDER BY a.appointment_date`,
      [deliveryId]
    ),
  ]);

  if (header.rows.length === 0) {
    return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    ...header.rows[0],
    methodTotals: methodTotals.rows,
    lines: lines.rows,
  });
}
