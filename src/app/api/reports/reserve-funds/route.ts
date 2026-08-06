import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Reporte de Fondos Reservados: filtrable por fondo/mes/año/empleado/servicio.
 * Todo el filtrado es server-side (mismo criterio que el resto de reportes, ver
 * [[reports_module]]); orden/búsqueda/paginación quedan del lado del cliente en
 * ReportTable.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('funds.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const fundId = searchParams.get('fundId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const employeeId = searchParams.get('employeeId');
  const serviceId = searchParams.get('serviceId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions: string[] = ['fm.voided_at IS NULL'];
  const values: unknown[] = [];

  if (fundId) {
    values.push(Number(fundId));
    conditions.push(`fm.fund_id = $${values.length}`);
  }
  if (year) {
    values.push(Number(year));
    conditions.push(`fp.year = $${values.length}`);
  }
  if (month) {
    values.push(Number(month));
    conditions.push(`fp.month = $${values.length}`);
  }
  if (employeeId) {
    values.push(Number(employeeId));
    conditions.push(`fm.team_member_id = $${values.length}`);
  }
  if (from) {
    values.push(from);
    conditions.push(`fm.created_at::date >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`fm.created_at::date <= $${values.length}`);
  }
  if (serviceId) {
    values.push(Number(serviceId));
    conditions.push(
      `EXISTS (SELECT 1 FROM appointment_services aps WHERE aps.appointment_id = fm.appointment_id AND aps.service_id = $${values.length})`
    );
  }

  const { rows } = await pool.query(
    `SELECT
       fm.id,
       to_char(fm.created_at, 'YYYY-MM-DD') AS date,
       rf.name AS "fundName",
       fm.movement_type AS "movementType",
       fm.direction,
       fm.amount::float8 AS amount,
       fm.concept,
       r.receipt_number AS "receiptNumber",
       c.name AS "customerName",
       u.name AS "employeeName",
       fp.year, fp.month
     FROM fund_movements fm
     JOIN reserve_funds rf ON rf.id = fm.fund_id
     JOIN financial_periods fp ON fp.id = fm.financial_period_id
     LEFT JOIN receipts r ON r.payment_id = fm.payment_id
     LEFT JOIN customers c ON c.id = fm.customer_id
     LEFT JOIN team_members tm ON tm.id = fm.team_member_id
     LEFT JOIN users u ON u.id = tm.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY fm.created_at DESC`,
    values
  );

  return NextResponse.json(rows);
}
