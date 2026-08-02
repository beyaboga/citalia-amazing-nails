import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Reporte financiero: ingresos (por servicios, de pagos no anulados), egresos
 * (gastos), utilidad, gastos por categoría y saldo por método de pago.
 *
 * Ingresos/egresos/utilidad respetan el período (y los filtros de categoría/método/
 * estado, sobre los gastos). El "saldo por método" es acumulado (balance actual,
 * desde la vista cash_movements), no un flujo del período.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('finance.reports');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null;
  const methodId = searchParams.get('methodId') ? Number(searchParams.get('methodId')) : null;
  // Para la utilidad, los egresos por defecto son los realmente pagados.
  const status = searchParams.get('status') || 'PAID';

  const [income, byCategory, balances, labor] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(subtotal - discount_amount), 0)::float8 AS ingresos
         FROM payments
        WHERE voided_at IS NULL
          AND ($1::date IS NULL OR created_at::date >= $1)
          AND ($2::date IS NULL OR created_at::date <= $2)`,
      [from, to]
    ),
    pool.query(
      `SELECT ec.name, COALESCE(SUM(e.amount), 0)::float8 AS total
         FROM expenses e
         JOIN expense_categories ec ON ec.id = e.expense_category_id
        WHERE e.status = $1
          AND ($2::date IS NULL OR e.expense_date >= $2)
          AND ($3::date IS NULL OR e.expense_date <= $3)
          AND ($4::int IS NULL OR e.expense_category_id = $4)
          AND ($5::int IS NULL OR e.payment_method_id = $5)
        GROUP BY ec.name
        ORDER BY total DESC`,
      [status, from, to, categoryId, methodId]
    ),
    pool.query(
      `SELECT pm.id, pm.name,
              COALESCE(SUM(CASE WHEN cm.direction = 'IN' THEN cm.amount ELSE -cm.amount END), 0)::float8 AS balance
         FROM payment_methods pm
         LEFT JOIN cash_movements cm ON cm.payment_method_id = pm.id
        WHERE pm.type <> 'SPLIT_PAYMENT'
        GROUP BY pm.id, pm.name, pm.display_order
        ORDER BY pm.display_order`
    ),
    // Costo de planilla del período: sueldos pagados + TODAS las comisiones pagadas
    // (los commission_payouts cubren tanto la planilla como el módulo de comisiones,
    // así que no hay doble conteo). Los adelantos NO son costo (se recuperan en el neto).
    pool.query(
      `SELECT
         COALESCE((SELECT SUM(salary_amount) FROM payroll_payments
                    WHERE ($1::date IS NULL OR paid_at::date >= $1)
                      AND ($2::date IS NULL OR paid_at::date <= $2)), 0)::float8 AS salary,
         COALESCE((SELECT SUM(total_amount) FROM commission_payouts
                    WHERE status = 'paid'
                      AND ($1::date IS NULL OR paid_at::date >= $1)
                      AND ($2::date IS NULL OR paid_at::date <= $2)), 0)::float8 AS commissions`,
      [from, to]
    ),
  ]);

  const ingresos = income.rows[0].ingresos;
  const expensesTotal = byCategory.rows.reduce((sum, r) => sum + r.total, 0);
  // La planilla solo se suma cuando no se filtra por una categoría de gasto específica.
  const laborCost = categoryId ? 0 : Math.round((labor.rows[0].salary + labor.rows[0].commissions) * 100) / 100;
  const egresos = Math.round((expensesTotal + laborCost) * 100) / 100;

  const byCategoryOut = [...byCategory.rows];
  if (laborCost > 0) byCategoryOut.push({ name: 'Planilla / sueldos', total: laborCost });

  return NextResponse.json({
    ingresos,
    egresos,
    utilidad: Math.round((ingresos - egresos) * 100) / 100,
    byCategory: byCategoryOut,
    balances: balances.rows,
  });
}
