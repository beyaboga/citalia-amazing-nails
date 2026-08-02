import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Comisiones para el módulo de pago. GET lista las comisiones (con servicio y
 * cliente) según filtros; POST liquida las seleccionadas creando un payout y
 * marcándolas como pagadas. Congelación: nunca se editan comisiones ya pagadas.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('commissions.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status') || 'pending';

  const conditions: string[] = [];
  const params: any[] = [];

  if (status !== 'all') {
    params.push(status);
    conditions.push(`ce.status = $${params.length}`);
  } else {
    conditions.push(`ce.status <> 'voided'`);
  }
  if (employeeId) {
    params.push(Number(employeeId));
    conditions.push(`ce.team_member_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`ce.calculated_at::date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`ce.calculated_at::date <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT ce.id,
            s.name AS "serviceName",
            COALESCE(c_line.name, c_total.name) AS "customerName",
            u.name AS "employeeName",
            ce.team_member_id AS "teamMemberId",
            ce.commission_amount::float8 AS "commissionAmount",
            ce.status,
            to_char(ce.calculated_at, 'YYYY-MM-DD') AS "date"
       FROM commission_entries ce
       LEFT JOIN appointment_services aps ON aps.id = ce.appointment_service_id
       LEFT JOIN services s ON s.id = ce.service_id
       LEFT JOIN appointments a_line ON a_line.id = aps.appointment_id
       LEFT JOIN customers c_line ON c_line.id = a_line.customer_id
       LEFT JOIN appointments a_total ON a_total.id = ce.appointment_id
       LEFT JOIN customers c_total ON c_total.id = a_total.customer_id
       JOIN team_members tm ON tm.id = ce.team_member_id
       JOIN users u ON u.id = tm.user_id
       ${where}
       ORDER BY ce.calculated_at DESC`,
    params
  );

  const total = rows.reduce((sum, r) => sum + r.commissionAmount, 0);
  return NextResponse.json({ entries: rows, total: Math.round(total * 100) / 100 });
}

export async function POST(request: Request) {
  const auth = await requirePermission('commissions.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const entryIds: number[] = Array.isArray(body?.entryIds)
    ? body.entryIds.map((n: any) => Number(n)).filter(Number.isInteger)
    : [];

  if (entryIds.length === 0) {
    return NextResponse.json({ error: 'Seleccione al menos una comisión para pagar' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Traer y bloquear las comisiones seleccionadas que sigan por pagar.
    const { rows: entries } = await client.query(
      `SELECT id, team_member_id AS "teamMemberId", commission_amount::float8 AS amount,
              to_char(calculated_at, 'YYYY-MM-DD') AS "date"
         FROM commission_entries
        WHERE id = ANY($1) AND status IN ('pending', 'approved')
        FOR UPDATE`,
      [entryIds]
    );

    if (entries.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No hay comisiones pendientes en la selección' }, { status: 400 });
    }

    // Todas deben ser del mismo empleado (un payout es por técnico).
    const teamMemberId = entries[0].teamMemberId;
    if (entries.some((e) => e.teamMemberId !== teamMemberId)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Solo se pueden pagar comisiones de un mismo empleado a la vez' },
        { status: 400 }
      );
    }

    const total = Math.round(entries.reduce((s, e) => s + e.amount, 0) * 100) / 100;
    const dates = entries.map((e) => e.date).sort();
    const ids = entries.map((e) => e.id);

    const { rows: payoutRows } = await client.query(
      `INSERT INTO commission_payouts (team_member_id, period_start, period_end, total_amount, status, paid_at, created_by)
       VALUES ($1, $2, $3, $4, 'paid', now(), $5)
       RETURNING id`,
      [teamMemberId, dates[0], dates[dates.length - 1], total, auth.user.id]
    );
    const payoutId = payoutRows[0].id;

    await client.query(
      `UPDATE commission_entries SET status = 'paid', payout_id = $1 WHERE id = ANY($2)`,
      [payoutId, ids]
    );

    await client.query('COMMIT');
    return NextResponse.json({ payoutId, paidCount: ids.length, total }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error paying commissions:', error);
    return NextResponse.json({ error: 'Error al pagar las comisiones' }, { status: 500 });
  } finally {
    client.release();
  }
}
