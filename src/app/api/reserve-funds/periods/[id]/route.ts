import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/** Resumen de cierre de un período (abierto o cerrado) — calculado en vivo sobre
 * los movimientos, que ya son inmutables una vez cerrado el período. No hace falta
 * una tabla de snapshot aparte.
 * Disponible = Recibido − Fondos reservados − Gastos pagados del período. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('funds.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const { rows: periodRows } = await pool.query(
    `SELECT id, year, month, status, opened_at, closed_at,
            (SELECT name FROM users WHERE id = closed_by) AS "closedByName"
       FROM financial_periods WHERE id = $1`,
    [id]
  );
  if (periodRows.length === 0) {
    return NextResponse.json({ error: 'Período no encontrado' }, { status: 404 });
  }
  const period = periodRows[0];

  const [receivedResult, fundsResult, expensesResult] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(pd.amount), 0)::float8 AS received
         FROM payment_details pd JOIN payments p ON p.id = pd.payment_id
        WHERE p.voided_at IS NULL
          AND EXTRACT(YEAR FROM p.created_at)::int = $1
          AND EXTRACT(MONTH FROM p.created_at)::int = $2`,
      [period.year, period.month]
    ),
    pool.query(
      `SELECT rf.id, rf.name, rf.kind,
              COALESCE(SUM(CASE WHEN fm.direction = 'IN' THEN fm.amount ELSE -fm.amount END), 0)::float8 AS balance
         FROM reserve_funds rf
         LEFT JOIN fund_movements fm ON fm.fund_id = rf.id AND fm.financial_period_id = $1 AND fm.voided_at IS NULL
        GROUP BY rf.id
        ORDER BY rf.display_order, rf.id`,
      [period.id]
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0)::float8 AS expenses
         FROM expenses
        WHERE status = 'PAID'
          AND EXTRACT(YEAR FROM expense_date)::int = $1
          AND EXTRACT(MONTH FROM expense_date)::int = $2`,
      [period.year, period.month]
    ),
  ]);

  const received = receivedResult.rows[0].received as number;
  const funds = fundsResult.rows as { id: number; name: string; kind: string; balance: number }[];
  const expenses = expensesResult.rows[0].expenses as number;
  const reserved = Math.round(funds.reduce((sum, f) => sum + f.balance, 0) * 100) / 100;

  return NextResponse.json({
    period,
    received,
    reserved,
    expenses,
    available: Math.round((received - reserved - expenses) * 100) / 100,
    breakdown: funds,
  });
}
