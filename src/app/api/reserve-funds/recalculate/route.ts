import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Recalcula las reservas FALTANTES del período abierto actual — rellena lo que
 * los triggers (forward-only) no alcanzaron: pagos que ya existían antes de
 * activar el módulo, o fondos personalizados creados a mitad de mes. Nunca
 * duplica (idempotente, ver 030_recalculate_reserve_funds.sql) y NUNCA reserva
 * comisiones que ya se pagaron (commission_entries.status = 'paid') — ese dinero
 * ya salió de caja de verdad y no hay payout futuro que la libere.
 */
export async function POST() {
  const auth = await requirePermission('funds.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await pool.query('SELECT close_elapsed_financial_periods()');
  const { rows: periodRows } = await pool.query(
    'SELECT get_or_create_financial_period(CURRENT_DATE) AS id'
  );
  const periodId = periodRows[0].id;

  try {
    const { rows } = await pool.query(
      'SELECT fund_id AS "fundId", fund_name AS "fundName", amount::float8 AS amount, movement_type AS "movementType" FROM recalculate_funds_for_period($1)',
      [periodId]
    );

    const byFund = new Map<
      string,
      { fundId: number; fundName: string; count: number; total: number }
    >();
    for (const r of rows) {
      const key = String(r.fundId);
      const entry = byFund.get(key) ?? {
        fundId: r.fundId,
        fundName: r.fundName,
        count: 0,
        total: 0,
      };
      entry.count += 1;
      entry.total = Math.round((entry.total + r.amount) * 100) / 100;
      byFund.set(key, entry);
    }

    return NextResponse.json({
      periodId,
      movementsCreated: rows.length,
      totalAdded: Math.round(rows.reduce((s: number, r: any) => s + r.amount, 0) * 100) / 100,
      byFund: Array.from(byFund.values()),
    });
  } catch (error: any) {
    if (error?.message?.includes('cerrado')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error recalculating reserve funds:', error);
    return NextResponse.json({ error: 'Error al recalcular los fondos' }, { status: 500 });
  }
}
