import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Adelantos a empleados. GET lista (opcional por empleado/estado); POST registra un
 * adelanto (dinero entregado por anticipado, sale de caja y se descuenta en la
 * planilla). Solo administración (`payroll.pay`).
 */
export async function GET(request: Request) {
  const auth = await requirePermission('payroll.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const conditions: string[] = [];
  const params: any[] = [];
  if (searchParams.get('employeeId')) {
    params.push(Number(searchParams.get('employeeId')));
    conditions.push(`ea.team_member_id = $${params.length}`);
  }
  if (searchParams.get('status')) {
    params.push(searchParams.get('status'));
    conditions.push(`ea.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT ea.id, ea.team_member_id AS "teamMemberId", u.name AS "employeeName",
            ea.amount::float8 AS amount, to_char(ea.advance_date, 'YYYY-MM-DD') AS "advanceDate",
            pm.name AS "methodName", ea.status, ea.notes
       FROM employee_advances ea
       JOIN team_members tm ON tm.id = ea.team_member_id
       JOIN users u ON u.id = tm.user_id
       JOIN payment_methods pm ON pm.id = ea.payment_method_id
       ${where}
       ORDER BY ea.advance_date DESC, ea.id DESC`,
    params
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('payroll.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const teamMemberId = Number(body?.employeeId);
  const amount = Number(body?.amount);
  const advanceDate = String(body?.advanceDate ?? '');
  const paymentMethodId = Number(body?.paymentMethodId);
  const notes = String(body?.notes ?? '').trim();

  if (!Number.isInteger(teamMemberId)) return NextResponse.json({ error: 'Empleado no válido' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(advanceDate)) return NextResponse.json({ error: 'La fecha no es válida' }, { status: 400 });
  if (!Number.isInteger(paymentMethodId)) return NextResponse.json({ error: 'Seleccione un método de pago' }, { status: 400 });

  const { rows: mrows } = await pool.query(
    `SELECT id FROM payment_methods WHERE id = $1 AND is_active AND type <> 'SPLIT_PAYMENT'`,
    [paymentMethodId]
  );
  if (mrows.length === 0) return NextResponse.json({ error: 'El método de pago no es válido' }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `INSERT INTO employee_advances (team_member_id, amount, advance_date, payment_method_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [teamMemberId, amount, advanceDate, paymentMethodId, notes || null, auth.user.id]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23503') return NextResponse.json({ error: 'El empleado o el método no existe' }, { status: 400 });
    console.error('Error creating advance:', error);
    return NextResponse.json({ error: 'Error al registrar el adelanto' }, { status: 500 });
  }
}
