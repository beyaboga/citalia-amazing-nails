import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { buildPayrollPreview } from '@/lib/payrollServer';

/**
 * POST /api/payroll/pay — ejecuta la planilla de un empleado para un período.
 *
 * Recalcula todo en el servidor (no confía en montos del cliente): crea el pago,
 * marca las comisiones del período como pagadas (dentro de un commission_payout) y
 * liquida los adelantos pendientes. La salida entra sola en cash_movements.
 */
export async function POST(request: Request) {
  const auth = await requirePermission('payroll.pay');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const employeeId = Number(body?.employeeId);
  const from = String(body?.periodStart ?? '');
  const to = String(body?.periodEnd ?? '');
  const paymentMethodId = Number(body?.paymentMethodId);
  const notes = String(body?.notes ?? '').trim();
  const includeCommissions = body?.includeCommissions !== false;
  const periodMode: 'MONTH' | 'CUSTOM' = body?.periodMode === 'CUSTOM' ? 'CUSTOM' : 'MONTH';
  const periodMonth = periodMode === 'MONTH' && Number.isInteger(Number(body?.periodMonth)) ? Number(body.periodMonth) : null;
  const periodYear = periodMode === 'MONTH' && Number.isInteger(Number(body?.periodYear)) ? Number(body.periodYear) : null;

  if (!Number.isInteger(employeeId)) return NextResponse.json({ error: 'Empleado no válido' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'Período no válido' }, { status: 400 });
  }
  if (!Number.isInteger(paymentMethodId)) return NextResponse.json({ error: 'Seleccione un método de pago' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Método válido y activo (no "Dividir pago").
    const { rows: mrows } = await client.query(
      `SELECT id FROM payment_methods WHERE id = $1 AND is_active AND type <> 'SPLIT_PAYMENT'`,
      [paymentMethodId]
    );
    if (mrows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'El método de pago no es válido' }, { status: 400 });
    }

    // Recalcular con bloqueo de las comisiones del período.
    const preview = await buildPayrollPreview(client, employeeId, from, to, includeCommissions);
    if (!preview) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }
    const effectiveCommission = includeCommissions ? preview.commissions.total : 0;
    if (preview.salary === 0 && effectiveCommission === 0 && preview.advances.total === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No hay nada que pagar en este período' }, { status: 400 });
    }

    const advanceIds = preview.advances.items.map((a) => a.id);

    // Comisiones del período → payout pagado (sólo si se decidió incluirlas; si no,
    // quedan pending/approved intactas para una nómina futura).
    let commissionPayoutId: number | null = null;
    if (includeCommissions) {
      const commissionIds = preview.commissions.items.map((c) => c.id);
      if (commissionIds.length > 0) {
        const { rows: po } = await client.query(
          `INSERT INTO commission_payouts (team_member_id, period_start, period_end, total_amount, status, paid_at, created_by)
           VALUES ($1, $2, $3, $4, 'paid', now(), $5) RETURNING id`,
          [employeeId, from, to, preview.commissions.total, auth.user.id]
        );
        commissionPayoutId = po[0].id;
        await client.query(
          `UPDATE commission_entries SET status = 'paid', payout_id = $1 WHERE id = ANY($2)`,
          [commissionPayoutId, commissionIds]
        );
      }
    }

    // Registrar el pago de planilla.
    const { rows: pp } = await client.query(
      `INSERT INTO payroll_payments
         (team_member_id, period_start, period_end, salary_amount, commission_amount,
          advance_deduction, net_amount, payment_method_id, commission_payout_id, notes, created_by,
          include_commissions, is_custom_range, period_month, period_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [employeeId, from, to, preview.salary, effectiveCommission,
       preview.advances.total, preview.net, paymentMethodId, commissionPayoutId, notes || null, auth.user.id,
       includeCommissions, periodMode === 'CUSTOM', periodMonth, periodYear]
    );
    const payrollId = pp[0].id;

    // Liquidar adelantos pendientes.
    if (advanceIds.length > 0) {
      await client.query(
        `UPDATE employee_advances SET status = 'SETTLED', settled_payroll_id = $1 WHERE id = ANY($2)`,
        [payrollId, advanceIds]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json(
      { payrollId, net: preview.net, salary: preview.salary, commission: effectiveCommission, advanceDeduction: preview.advances.total },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error paying payroll:', error);
    return NextResponse.json({ error: 'Error al pagar la planilla' }, { status: 500 });
  } finally {
    client.release();
  }
}
