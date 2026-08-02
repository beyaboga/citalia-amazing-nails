import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/customer-followup — tabla principal de seguimiento (cliente + categoría).
 *
 * Los datos ya vienen calculados en `customer_category_statistics` (recalculada sola
 * por triggers al completar/pagar una cita — ver db/init/022_customer_followup.sql).
 * Este endpoint solo lee y filtra.
 *
 * Filtros: status (ON_TIME|UPCOMING|OVERDUE|INSUFFICIENT_DATA|TODAY|LOST),
 * categoryId, search (nombre del cliente), from/to (rango sobre la última visita).
 */
export async function GET(request: Request) {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions: string[] = [];
  const params: any[] = [];
  const add = (cond: string, value: any) => {
    params.push(value);
    conditions.push(cond.replace('$?', `$${params.length}`));
  };

  // "Hoy" y "Perdido" son vistas derivadas del dashboard, no estados guardados.
  if (status === 'TODAY') {
    conditions.push(`st.estimated_next_visit = CURRENT_DATE`);
  } else if (status === 'LOST') {
    const { rows: cfg } = await pool.query('SELECT lost_multiplier::float8 AS m FROM customer_followup_settings WHERE id = 1');
    const multiplier = cfg[0]?.m ?? 1;
    add(
      `st.status = 'OVERDUE' AND (CURRENT_DATE - st.estimated_next_visit) >= (st.average_days_between_visits * $?)`,
      multiplier
    );
  } else if (status) {
    add('st.status = $?', status);
  }

  if (categoryId) add('st.service_category_id = $?', Number(categoryId));
  if (search) add('c.name ILIKE $?', `%${search}%`);
  if (from) add('st.last_visit_date >= $?', from);
  if (to) add('st.last_visit_date <= $?', to);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT c.id AS "customerId", c.name AS "customerName", c.phone AS "customerPhone",
            sc.id AS "categoryId", sc.name AS "categoryName",
            to_char(st.last_visit_date, 'YYYY-MM-DD') AS "lastVisitDate",
            st.average_days_between_visits::float8 AS "averageDays",
            to_char(st.estimated_next_visit, 'YYYY-MM-DD') AS "estimatedNextVisit",
            st.total_visits AS "totalVisits",
            st.status,
            CASE WHEN st.estimated_next_visit IS NOT NULL
                 THEN (CURRENT_DATE - st.estimated_next_visit) ELSE NULL END AS "daysLate"
       FROM customer_category_statistics st
       JOIN customers c ON c.id = st.customer_id
       JOIN service_categories sc ON sc.id = st.service_category_id
       ${where}
       ORDER BY (st.status = 'OVERDUE') DESC, st.estimated_next_visit ASC NULLS LAST, c.name`,
    params
  );

  return NextResponse.json(rows);
}
