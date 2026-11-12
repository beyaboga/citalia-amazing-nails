import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/dashboard?from=&to= — métricas reales del panel principal (solo administración).
 *
 * Ingresos = ingreso por servicios de los pagos no anulados (subtotal − descuento),
 * sin propinas. Todo se calcula en el servidor desde la base; nada se inventa en el
 * cliente. Ver [[payments-module]] y [[payroll-module]].
 *
 * La mayoría de las métricas siguen el período `from`/`to` (default: mes actual) y
 * se comparan contra el período anterior de igual longitud. Tres quedan fijas por
 * naturaleza (no son "de un período"): `customerFollowup` (foto del estado actual),
 * `cashDeliveries` (saldo pendiente de entrega, acumulado) y `upcoming` (citas de
 * HOY). `incomeVsExpense` también queda fija en los últimos 6 meses — es la única
 * vista de tendencia de largo plazo del dashboard; atarla a un período corto la
 * volvería redundante con el gráfico de ingresos por día.
 */
const DOW_LABEL = `CASE EXTRACT(DOW FROM d.day)::int
  WHEN 0 THEN 'Dom' WHEN 1 THEN 'Lun' WHEN 2 THEN 'Mar' WHEN 3 THEN 'Mié'
  WHEN 4 THEN 'Jue' WHEN 5 THEN 'Vie' WHEN 6 THEN 'Sáb' END`;

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// `new Date('YYYY-MM-DD')` parsea como UTC medianoche, pero fmt() lee con
// getters LOCALES — mezclar ambos desfasa un día según la zona horaria del
// servidor. parseLocalDate evita el camino UTC por completo.
const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export async function GET(request: Request) {
  const auth = await requirePermission('reports.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const from = searchParams.get('from') || fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = searchParams.get('to') || fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // Período anterior, misma longitud, inmediatamente antes de `from`.
  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to);
  const dayCount = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const prevToDate = addDays(fromDate, -1);
  const prevFromDate = addDays(prevToDate, -(dayCount - 1));
  const prevTo = fmt(prevToDate);
  const prevFrom = fmt(prevFromDate);

  const tz = "AT TIME ZONE 'America/Tegucigalpa'";
  const winCols = (a: string, b: string, k: string) => `
        (SELECT COALESCE(SUM(subtotal - discount_amount), 0) FROM payments WHERE voided_at IS NULL
           AND (created_at ${tz})::date BETWEEN ${a} AND ${b})::float8 AS ${k}income,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN ${a} AND ${b} AND status <> 'cancelled')::int AS ${k}appts,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN ${a} AND ${b} AND status = 'cancelled')::int AS ${k}cancellations,
        ((SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE status = 'PAID' AND expense_date BETWEEN ${a} AND ${b})
         + (SELECT COALESCE(SUM(salary_amount), 0) FROM payroll_payments WHERE (paid_at ${tz})::date BETWEEN ${a} AND ${b})
         + (SELECT COALESCE(SUM(total_amount), 0) FROM commission_payouts WHERE status = 'paid' AND (paid_at ${tz})::date BETWEEN ${a} AND ${b}))::float8 AS ${k}expense,
        (SELECT COUNT(DISTINCT customer_id) FROM customer_category_visits WHERE visit_date BETWEEN ${a} AND ${b})::int AS ${k}customers`;
  const mtdSql = `
      WITH w AS (
        SELECT d.today,
               date_trunc('month', d.today)::date AS cur_from,
               (date_trunc('month', d.today) - interval '1 month')::date AS prev_from,
               LEAST((date_trunc('month', d.today) - interval '1 month')::date + (EXTRACT(DAY FROM d.today)::int - 1),
                     (date_trunc('month', d.today) - interval '1 day')::date) AS prev_to,
               (date_trunc('month', d.today) - interval '1 day')::date AS prev_end
          FROM (SELECT (now() ${tz})::date AS today) d
      )
      SELECT to_char(w.today, 'YYYY-MM-DD') AS today, to_char(w.cur_from, 'YYYY-MM-DD') AS cur_from,
             to_char(w.prev_from, 'YYYY-MM-DD') AS prev_from, to_char(w.prev_to, 'YYYY-MM-DD') AS prev_to,
             to_char(w.prev_end, 'YYYY-MM-DD') AS prev_end,
             ${winCols('w.cur_from', 'w.today', '')},
             ${winCols('w.prev_from', 'w.prev_to', 'prev_')},
             ${winCols('w.prev_from', 'w.prev_end', 'full_')}
      FROM w`;

  const [mtd, scalars, topService, byDay, revenueByDay, byCategory, topTechs, upcoming, incomeVsExpense, followup, cashPending, customerStats] = await Promise.all([
    // Comparación MoM: mes en curso (1 → hoy) contra el mes anterior en dos versiones:
    // "al día" (1 → mismo día, acotado al fin de ese mes) y "completo" (todo el mes).
    // Independiente del filtro de período del dashboard.
    pool.query(mtdSql),
    pool.query(
      `SELECT
        (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN $1 AND $2 AND status <> 'cancelled')::int AS appts,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN $3 AND $4 AND status <> 'cancelled')::int AS prev_appts,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN $1 AND $2 AND status = 'cancelled')::int AS cancellations,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date BETWEEN $3 AND $4 AND status = 'cancelled')::int AS prev_cancellations,
        (SELECT COALESCE(SUM(subtotal - discount_amount), 0) FROM payments
             WHERE voided_at IS NULL AND (created_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $1 AND $2)::float8 AS income,
        (SELECT COALESCE(SUM(subtotal - discount_amount), 0) FROM payments
             WHERE voided_at IS NULL AND (created_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $3 AND $4)::float8 AS prev_income,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses
             WHERE status = 'PAID' AND expense_date BETWEEN $1 AND $2)::float8 AS expense,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses
             WHERE status = 'PAID' AND expense_date BETWEEN $3 AND $4)::float8 AS prev_expense,
        (SELECT COALESCE(SUM(salary_amount), 0) FROM payroll_payments WHERE (paid_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $1 AND $2)::float8 AS salary,
        (SELECT COALESCE(SUM(salary_amount), 0) FROM payroll_payments WHERE (paid_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $3 AND $4)::float8 AS prev_salary,
        (SELECT COALESCE(SUM(total_amount), 0) FROM commission_payouts
             WHERE status = 'paid' AND (paid_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $1 AND $2)::float8 AS commissions,
        (SELECT COALESCE(SUM(total_amount), 0) FROM commission_payouts
             WHERE status = 'paid' AND (paid_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $3 AND $4)::float8 AS prev_commissions
      `,
      [from, to, prevFrom, prevTo]
    ),
    pool.query(
      `SELECT s.name, COUNT(*)::int AS count
         FROM appointment_services aps
         JOIN appointments a ON a.id = aps.appointment_id
         JOIN services s ON s.id = aps.service_id
        WHERE a.appointment_date BETWEEN $1 AND $2
        GROUP BY s.name ORDER BY count DESC LIMIT 1`,
      [from, to]
    ),
    pool.query(
      `SELECT ${DOW_LABEL} AS day,
              COUNT(a.id) FILTER (WHERE a.status <> 'cancelled')::int AS appointments,
              COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed
         FROM generate_series($1::date, $2::date, interval '1 day') d(day)
         LEFT JOIN appointments a ON a.appointment_date = d.day::date
        GROUP BY d.day ORDER BY d.day`,
      [from, to]
    ),
    pool.query(
      `SELECT ${DOW_LABEL} AS day,
              COALESCE(SUM(p.subtotal - p.discount_amount) FILTER (WHERE p.voided_at IS NULL), 0)::float8 AS revenue
         FROM generate_series($1::date, $2::date, interval '1 day') d(day)
         LEFT JOIN payments p ON (p.created_at AT TIME ZONE 'America/Tegucigalpa')::date = d.day::date
        GROUP BY d.day ORDER BY d.day`,
      [from, to]
    ),
    pool.query(
      `SELECT sc.name, COUNT(*)::int AS value
         FROM appointment_services aps
         JOIN appointments a ON a.id = aps.appointment_id
         JOIN services s ON s.id = aps.service_id
         JOIN service_categories sc ON sc.id = s.category_id
        WHERE a.appointment_date BETWEEN $1 AND $2
        GROUP BY sc.name ORDER BY value DESC`,
      [from, to]
    ),
    pool.query(
      `SELECT u.name, COALESCE(SUM(p.subtotal - p.discount_amount), 0)::float8 AS revenue
         FROM payments p
         JOIN appointments a ON a.id = p.appointment_id
         JOIN users u ON u.id = a.technician_id
        WHERE p.voided_at IS NULL AND (p.created_at AT TIME ZONE 'America/Tegucigalpa')::date BETWEEN $1 AND $2
        GROUP BY u.name ORDER BY revenue DESC LIMIT 5`,
      [from, to]
    ),
    pool.query(`
      SELECT a.id, c.name AS "clientName", c.phone,
             to_char(a.appointment_time, 'HH12:MI AM') AS time,
             a.status,
             COALESCE(string_agg(DISTINCT s.name, ', '), '') AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
        LEFT JOIN services s ON s.id = aps.service_id
       WHERE a.appointment_date = CURRENT_DATE AND a.status IN ('pending', 'confirmed', 'in_progress')
       GROUP BY a.id, c.name, c.phone, a.appointment_time, a.status
       ORDER BY a.appointment_time
       LIMIT 10
    `),
    pool.query(`
      SELECT
        CASE EXTRACT(MONTH FROM m.month)::int
          WHEN 1 THEN 'Ene' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Abr'
          WHEN 5 THEN 'May' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Ago'
          WHEN 9 THEN 'Sep' WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dic' END AS month,
        COALESCE((SELECT SUM(p.subtotal - p.discount_amount) FROM payments p
                   WHERE p.voided_at IS NULL AND date_trunc('month', p.created_at) = m.month), 0)::float8 AS income,
        (COALESCE((SELECT SUM(e.amount) FROM expenses e
                    WHERE e.status = 'PAID' AND date_trunc('month', e.expense_date) = m.month), 0)
         + COALESCE((SELECT SUM(pp.salary_amount) FROM payroll_payments pp
                      WHERE date_trunc('month', pp.paid_at) = m.month), 0)
         + COALESCE((SELECT SUM(cp.total_amount) FROM commission_payouts cp
                      WHERE cp.status = 'paid' AND date_trunc('month', cp.paid_at) = m.month), 0))::float8 AS expenses
      FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months',
                           date_trunc('month', CURRENT_DATE), interval '1 month') m(month)
      ORDER BY m.month
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE estimated_next_visit = CURRENT_DATE)::int AS today,
        COUNT(*) FILTER (WHERE status = 'UPCOMING')::int AS upcoming,
        COUNT(*) FILTER (WHERE status = 'OVERDUE')::int AS overdue,
        COUNT(*) FILTER (
          WHERE status = 'OVERDUE'
            AND (CURRENT_DATE - estimated_next_visit) >= (average_days_between_visits * (SELECT lost_multiplier FROM customer_followup_settings WHERE id = 1))
        )::int AS lost
      FROM customer_category_statistics st
      WHERE NOT EXISTS (
        SELECT 1 FROM appointments fa
         WHERE fa.customer_id = st.customer_id
           AND fa.appointment_date >= CURRENT_DATE
           AND fa.status::text IN ('pending', 'confirmed', 'in_progress')
      )
    `),
    pool.query(`
      SELECT
        COALESCE(SUM(pd.amount) FILTER (WHERE pm.type = 'CASH'), 0)::float8 AS cash,
        COALESCE(SUM(pd.amount) FILTER (WHERE pm.type <> 'CASH'), 0)::float8 AS transfers,
        (SELECT to_char(MAX(delivery_date), 'YYYY-MM-DD HH24:MI') FROM cash_deliveries) AS "lastDelivery"
      FROM payments p
      JOIN payment_details pd ON pd.payment_id = p.id
      JOIN payment_methods pm ON pm.id = pd.payment_method_id
      WHERE p.payment_status = 'PAID' AND p.voided_at IS NULL AND NOT p.is_delivered
    `),
    pool.query(
      `WITH first_visit AS (
         SELECT customer_id, MIN(visit_date) AS first_visit_date
           FROM customer_category_visits GROUP BY customer_id
       ),
       active_in_period AS (
         SELECT DISTINCT customer_id FROM customer_category_visits WHERE visit_date BETWEEN $1 AND $2
       ),
       active_in_prev_period AS (
         SELECT DISTINCT customer_id FROM customer_category_visits WHERE visit_date BETWEEN $3 AND $4
       )
       SELECT
         (SELECT COUNT(*) FROM active_in_period)::int AS total,
         (SELECT COUNT(*) FROM active_in_prev_period)::int AS prev_total,
         COUNT(*) FILTER (WHERE fv.first_visit_date BETWEEN $1 AND $2)::int AS nuevas,
         COUNT(*) FILTER (WHERE fv.first_visit_date < $1)::int AS recurrentes
         FROM active_in_period ap JOIN first_visit fv ON fv.customer_id = ap.customer_id`,
      [from, to, prevFrom, prevTo]
    ),
  ]);

  const s = scalars.rows[0];
  const mt = mtd.rows[0];
  const cs = customerStats.rows[0];
  const pct = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
  // Para gastos/cancelaciones, "positivo" es que hayan bajado, no subido.
  // El signo del porcentaje siempre es la dirección real (subió = +); lo bueno/malo
  // lo marca `isPositive` aparte.
  const pctLowerIsBetter = pct;

  const utilidad = Math.round((s.income - s.expense - s.salary - s.commissions) * 100) / 100;
  const prevUtilidad = Math.round((s.prev_income - s.prev_expense - s.prev_salary - s.prev_commissions) * 100) / 100;

  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = (iso: string) => Number(iso.slice(8, 10));
  const mon = (iso: string) => monthNames[Number(iso.slice(5, 7)) - 1];
  const mom = (cur: number, prev: number, lowerIsBetter = false) => ({
    current: cur,
    previous: prev,
    pct: lowerIsBetter ? pctLowerIsBetter(cur, prev) : pct(cur, prev),
    isPositive: lowerIsBetter ? cur <= prev : cur >= prev,
  });
  const mkSet = (pfx: string) => {
    const util = Math.round((mt.income - mt.expense) * 100) / 100;
    const pUtil = Math.round((mt[pfx + 'income'] - mt[pfx + 'expense']) * 100) / 100;
    return {
      income: mom(mt.income, mt[pfx + 'income']),
      appointments: mom(mt.appts, mt[pfx + 'appts']),
      cancellations: mom(mt.cancellations, mt[pfx + 'cancellations'], true),
      expense: mom(mt.expense, mt[pfx + 'expense'], true),
      utilidad: mom(util, pUtil),
      customers: mom(mt.customers, mt[pfx + 'customers']),
    };
  };

  return NextResponse.json({
    period: { from, to },
    momToDateLabel: `${day(mt.prev_from)}–${day(mt.prev_to)} ${mon(mt.prev_from)}`,
    momFullLabel: `${mon(mt.prev_from)} completo`,
    momToDate: mkSet('prev_'),
    momFull: mkSet('full_'),
    metrics: {
      appointments: s.appts,
      appointmentsTrend: { value: pct(s.appts, s.prev_appts), isPositive: s.appts >= s.prev_appts },
      cancellations: s.cancellations,
      cancellationsTrend: { value: pctLowerIsBetter(s.cancellations, s.prev_cancellations), isPositive: s.cancellations <= s.prev_cancellations },
      topService: topService.rows[0] ?? null,
      income: s.income,
      incomeTrend: { value: pct(s.income, s.prev_income), isPositive: s.income >= s.prev_income },
      expense: Math.round((s.expense + s.salary + s.commissions) * 100) / 100,
      expenseTrend: {
        value: pctLowerIsBetter(s.expense + s.salary + s.commissions, s.prev_expense + s.prev_salary + s.prev_commissions),
        isPositive: (s.expense + s.salary + s.commissions) <= (s.prev_expense + s.prev_salary + s.prev_commissions),
      },
      utilidad,
      utilidadTrend: { value: pct(utilidad, prevUtilidad), isPositive: utilidad >= prevUtilidad },
      totalCustomers: cs.total,
      totalCustomersTrend: { value: pct(cs.total, cs.prev_total), isPositive: cs.total >= cs.prev_total },
      newCustomers: cs.nuevas,
      returningCustomers: cs.recurrentes,
      topTechnician: topTechs.rows[0] ?? null,
    },
    appointmentsByDay: byDay.rows,
    revenueByDay: revenueByDay.rows,
    servicesByCategory: byCategory.rows,
    topTechnicians: topTechs.rows,
    incomeVsExpense: incomeVsExpense.rows,
    upcoming: upcoming.rows,
    customerFollowup: followup.rows[0],
    cashDeliveries: {
      pendingCash: cashPending.rows[0].cash,
      pendingTransfers: cashPending.rows[0].transfers,
      pendingTotal: Math.round((cashPending.rows[0].cash + cashPending.rows[0].transfers) * 100) / 100,
      lastDelivery: cashPending.rows[0].lastDelivery,
    },
  });
}
