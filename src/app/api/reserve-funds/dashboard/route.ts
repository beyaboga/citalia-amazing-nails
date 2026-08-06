import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Panel principal de Fondos Reservados: recibido, fondos reservados (con desglose
 * por fondo), gastos del mes y disponible real, para el período ABIERTO actual —
 * acumulado desde que abrió el mes, no solo "hoy", para que el propietario sepa
 * en todo momento cuánto tiene comprometido.
 * Disponible = Recibido − Fondos reservados − Gastos del período.
 * Los gastos son los del módulo de Gastos (`expenses`, status='PAID'), mismo
 * criterio que usa `cash_movements` — ver [[expenses_module]].
 */
export async function GET() {
  const auth = await requirePermission('funds.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await pool.query('SELECT close_elapsed_financial_periods()');
  const { rows: periodRows } = await pool.query(
    `SELECT id, year, month FROM financial_periods
     WHERE (year, month) = (EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int)`
  );
  let period = periodRows[0];
  if (!period) {
    const { rows } = await pool.query(
      `SELECT get_or_create_financial_period(CURRENT_DATE) AS id,
              EXTRACT(YEAR FROM CURRENT_DATE)::int AS year, EXTRACT(MONTH FROM CURRENT_DATE)::int AS month`
    );
    period = rows[0];
  }

  const [receivedResult, fundsResult, expensesResult] = await Promise.all([
    // "Recibido" = dinero que efectivamente entró a caja por pagos de citas en el período
    // (mismo criterio que cash_movements, direction='IN'), incluye propina.
    pool.query(
      `SELECT COALESCE(SUM(pd.amount), 0)::float8 AS received
         FROM payment_details pd
         JOIN payments p ON p.id = pd.payment_id
        WHERE p.voided_at IS NULL
          AND EXTRACT(YEAR FROM p.created_at)::int = $1
          AND EXTRACT(MONTH FROM p.created_at)::int = $2`,
      [period.year, period.month]
    ),
    pool.query(
      `SELECT rf.id, rf.name, rf.kind, rf.display_order AS "displayOrder",
              COALESCE(SUM(CASE
                WHEN fm.voided_at IS NOT NULL THEN 0
                WHEN fm.direction = 'IN' THEN fm.amount
                ELSE -fm.amount
              END), 0)::float8 AS balance
         FROM reserve_funds rf
         LEFT JOIN fund_movements fm ON fm.fund_id = rf.id AND fm.financial_period_id = $1
        GROUP BY rf.id
        ORDER BY rf.display_order, rf.id`,
      [period.id]
    ),
    // Gastos pagados del mismo período (módulo de Gastos), mismo criterio que
    // cash_movements: solo status='PAID' baja el saldo real.
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
  const funds = fundsResult.rows as {
    id: number;
    name: string;
    kind: string;
    displayOrder: number;
    balance: number;
  }[];
  const expenses = expensesResult.rows[0].expenses as number;
  const reserved = Math.round(funds.reduce((sum, f) => sum + f.balance, 0) * 100) / 100;
  const available = Math.round((received - reserved - expenses) * 100) / 100;

  return NextResponse.json({
    period: { id: period.id, year: period.year, month: period.month },
    received,
    reserved,
    expenses,
    available,
    breakdown: funds,
  });
}
