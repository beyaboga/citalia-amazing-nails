import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/** Lista de períodos financieros (meses), más recientes primero, con totales
 * agregados para la vista de historial de cierres.
 * Disponible = Recibido − Fondos reservados − Gastos pagados del período. */
export async function GET() {
  const auth = await requirePermission('funds.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await pool.query('SELECT close_elapsed_financial_periods()');
  await pool.query('SELECT get_or_create_financial_period(CURRENT_DATE)');

  const { rows } = await pool.query(
    `SELECT
       fp.id, fp.year, fp.month, fp.status, fp.opened_at, fp.closed_at,
       u.name AS "closedByName",
       COALESCE((
         SELECT SUM(pd.amount)
           FROM payment_details pd JOIN payments p ON p.id = pd.payment_id
          WHERE p.voided_at IS NULL
            AND EXTRACT(YEAR FROM p.created_at)::int = fp.year
            AND EXTRACT(MONTH FROM p.created_at)::int = fp.month
       ), 0)::float8 AS received,
       COALESCE((
         SELECT SUM(CASE WHEN fm.direction = 'IN' THEN fm.amount ELSE -fm.amount END)
           FROM fund_movements fm
          WHERE fm.financial_period_id = fp.id AND fm.voided_at IS NULL
       ), 0)::float8 AS reserved,
       COALESCE((
         SELECT SUM(e.amount)
           FROM expenses e
          WHERE e.status = 'PAID'
            AND EXTRACT(YEAR FROM e.expense_date)::int = fp.year
            AND EXTRACT(MONTH FROM e.expense_date)::int = fp.month
       ), 0)::float8 AS expenses
     FROM financial_periods fp
     LEFT JOIN users u ON u.id = fp.closed_by
     ORDER BY fp.year DESC, fp.month DESC`
  );

  const result = rows.map((r) => ({
    ...r,
    available: Math.round((r.received - r.reserved - r.expenses) * 100) / 100,
  }));

  return NextResponse.json(result);
}
