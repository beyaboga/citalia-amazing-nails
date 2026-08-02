import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { classifyCustomer, type CustomerSegment } from '@/lib/customerSegments';

/**
 * GET /api/reports/customers — una fila por cliente: primera/última visita,
 * cantidad de visitas, total gastado, servicio y empleado favoritos, segmento.
 * Fuente: customer_category_visits (misma definición de "visita calificada" que
 * ya mantienen los triggers de seguimiento — completada o pagada).
 */
export async function GET(request: Request) {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const segment = searchParams.get('segment') as CustomerSegment | null;

  const { rows } = await pool.query(
    `WITH visits AS (
       SELECT ccv.customer_id, ccv.appointment_id, ccv.visit_date, ccv.amount_paid, ccv.employee_id
         FROM customer_category_visits ccv
     ),
     per_customer AS (
       SELECT customer_id,
              MIN(visit_date) AS first_visit, MAX(visit_date) AS last_visit,
              COUNT(DISTINCT appointment_id) AS visit_count,
              COALESCE(SUM(amount_paid), 0) AS total_spent,
              COUNT(DISTINCT appointment_id) FILTER (WHERE visit_date >= CURRENT_DATE - 90) AS recent_visit_count
         FROM visits GROUP BY customer_id
     ),
     -- ROW_NUMBER() (no RANK()) + desempate por nombre: en caso de empate en
     -- cantidad, RANK() daría rnk=1 a varias filas y duplicaría al cliente al
     -- unir con la consulta principal. ROW_NUMBER() garantiza una sola fila.
     fav_service AS (
       SELECT customer_id, name FROM (
         SELECT a.customer_id, s.name, ROW_NUMBER() OVER (PARTITION BY a.customer_id ORDER BY COUNT(*) DESC, s.name) rn
           FROM appointment_services aps
           JOIN appointments a ON a.id = aps.appointment_id
           JOIN services s ON s.id = aps.service_id
          WHERE a.id IN (SELECT DISTINCT appointment_id FROM visits)
          GROUP BY a.customer_id, s.name
       ) x WHERE rn = 1
     ),
     fav_employee AS (
       SELECT customer_id, employee_id FROM (
         SELECT v.customer_id, v.employee_id, u2.name AS employee_name,
                ROW_NUMBER() OVER (PARTITION BY v.customer_id ORDER BY COUNT(*) DESC, u2.name) rn
           FROM visits v
           JOIN users u2 ON u2.id = v.employee_id
          WHERE v.employee_id IS NOT NULL
          GROUP BY v.customer_id, v.employee_id, u2.name
       ) x WHERE rn = 1
     )
     SELECT c.id, c.name, to_char(c.registration_date, 'YYYY-MM-DD') AS "registrationDate",
            to_char(pc.first_visit, 'YYYY-MM-DD') AS "firstVisit",
            to_char(pc.last_visit, 'YYYY-MM-DD') AS "lastVisit",
            COALESCE(pc.visit_count, 0)::int AS "visitCount",
            COALESCE(pc.total_spent, 0)::float8 AS "totalSpent",
            COALESCE(pc.recent_visit_count, 0)::int AS "recentVisitCount",
            fs.name AS "favoriteService", u.name AS "favoriteEmployeeName"
       FROM customers c
       LEFT JOIN per_customer pc ON pc.customer_id = c.id
       LEFT JOIN fav_service fs ON fs.customer_id = c.id
       LEFT JOIN fav_employee fe ON fe.customer_id = c.id
       LEFT JOIN users u ON u.id = fe.employee_id
      WHERE ($1::text IS NULL OR c.name ILIKE '%' || $1 || '%')
      ORDER BY c.name`,
    [search || null]
  );

  let classified = rows.map((r) => ({
    ...r,
    ticketAverage: r.visitCount > 0 ? Math.round((r.totalSpent / r.visitCount) * 100) / 100 : 0,
    segment: classifyCustomer(r),
  }));

  const indicators = {
    nuevas: classified.filter((r) => r.segment === 'NUEVA').length,
    frecuentes: classified.filter((r) => r.segment === 'FRECUENTE').length,
    vip: classified.filter((r) => r.segment === 'VIP').length,
    inactivas: classified.filter((r) => r.segment === 'INACTIVA').length,
  };

  if (segment) {
    classified = classified.filter((r) => r.segment === segment);
  }

  return NextResponse.json({ rows: classified, indicators });
}
