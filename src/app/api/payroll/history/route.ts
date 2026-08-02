import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/payroll/history?employeeId= — últimos pagos de planilla del empleado,
 * con el período liquidado (mes o rango personalizado) separado de la fecha real
 * del pago.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('payroll.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const employeeId = Number(searchParams.get('employeeId'));
  if (!Number.isInteger(employeeId)) {
    return NextResponse.json({ error: 'Empleado no válido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT id, to_char(period_start, 'YYYY-MM-DD') AS "periodStart",
            to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
            period_month AS "periodMonth", period_year AS "periodYear",
            is_custom_range AS "isCustomRange", include_commissions AS "includeCommissions",
            salary_amount::float8 AS "salaryAmount", commission_amount::float8 AS "commissionAmount",
            advance_deduction::float8 AS "advanceDeduction", net_amount::float8 AS "netAmount",
            paid_at AS "paidAt"
       FROM payroll_payments
      WHERE team_member_id = $1
      ORDER BY paid_at DESC
      LIMIT 24`,
    [employeeId]
  );

  return NextResponse.json(rows);
}
