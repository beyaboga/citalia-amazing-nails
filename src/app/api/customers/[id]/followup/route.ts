import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/customers/[id]/followup — vista de detalle: resumen del cliente +
 * seguimiento por categoría (con los servicios que arman el cálculo de cada una).
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const [summary, breakdown] = await Promise.all([
    pool.query(
      `SELECT c.name, c.phone,
              COALESCE(SUM(st.total_visits), 0)::int AS "totalVisits",
              COALESCE(SUM(st.total_spent), 0)::float8 AS "totalSpent",
              to_char(MAX(st.last_visit_date), 'YYYY-MM-DD') AS "lastVisitDate"
         FROM customers c
         LEFT JOIN customer_category_statistics st ON st.customer_id = c.id
        WHERE c.id = $1
        GROUP BY c.id, c.name, c.phone`,
      [customerId]
    ),
    pool.query(
      `SELECT sc.id AS "categoryId", sc.name AS "categoryName",
              st.total_visits AS "totalVisits",
              st.average_days_between_visits::float8 AS "averageDays",
              to_char(st.last_visit_date, 'YYYY-MM-DD') AS "lastVisitDate",
              to_char(st.estimated_next_visit, 'YYYY-MM-DD') AS "estimatedNextVisit",
              st.total_spent::float8 AS "totalSpent",
              u.name AS "favoriteEmployeeName",
              st.status,
              CASE WHEN st.estimated_next_visit IS NOT NULL
                   THEN (CURRENT_DATE - st.estimated_next_visit) ELSE NULL END AS "daysLate",
              COALESCE((
                SELECT array_agg(DISTINCT s.name ORDER BY s.name)
                  FROM customer_category_visits v
                  JOIN appointment_services aps ON aps.appointment_id = v.appointment_id
                  JOIN services s ON s.id = aps.service_id AND s.category_id = sc.id
                 WHERE v.customer_id = st.customer_id AND v.service_category_id = sc.id
              ), '{}') AS "services"
         FROM customer_category_statistics st
         JOIN service_categories sc ON sc.id = st.service_category_id
         LEFT JOIN users u ON u.id = st.favorite_employee_id
        WHERE st.customer_id = $1
        ORDER BY st.total_visits DESC`,
      [customerId]
    ),
  ]);

  if (summary.rows.length === 0) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ summary: summary.rows[0], categories: breakdown.rows });
}
