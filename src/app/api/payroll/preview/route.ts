import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { buildPayrollPreview } from '@/lib/payrollServer';
import { defaultPeriod, type PayFrequency } from '@/lib/payroll';

/**
 * GET /api/payroll/preview?employeeId=&from=&to=
 * Calcula la planilla del período (sueldo + comisiones − adelantos = neto). Si no se
 * envía período, usa el actual según la frecuencia del empleado.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('payroll.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const employeeId = Number(searchParams.get('employeeId'));
  if (!Number.isInteger(employeeId)) {
    return NextResponse.json({ error: 'Empleado no válido' }, { status: 400 });
  }

  let from = searchParams.get('from');
  let to = searchParams.get('to');

  if (!from || !to) {
    const { rows } = await pool.query(
      `SELECT COALESCE(pay_frequency, 'MONTHLY') AS "payFrequency"
         FROM employee_payment_configs WHERE team_member_id = $1`,
      [employeeId]
    );
    const freq: PayFrequency = (rows[0]?.payFrequency as PayFrequency) ?? 'MONTHLY';
    const period = defaultPeriod(freq);
    from = from || period.from;
    to = to || period.to;
  }

  const includeCommissions = searchParams.get('includeCommissions') !== 'false';

  const preview = await buildPayrollPreview(pool, employeeId, from, to, includeCommissions);
  if (!preview) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  return NextResponse.json(preview);
}
