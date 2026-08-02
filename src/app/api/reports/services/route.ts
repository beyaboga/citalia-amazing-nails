import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const round2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

/**
 * GET /api/reports/services — una fila por servicio (solo citas `completed` por
 * defecto, igual que /api/reports/payroll). "Empleado que más lo realiza" se
 * calcula con RANK() por servicio sobre la cantidad de veces que cada técnica lo
 * hizo en el rango filtrado.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('reports.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const employeeId = searchParams.get('employeeId');
  const categoryId = searchParams.get('categoryId');
  const status = searchParams.get('status') || 'completed';

  const params = [from || null, to || null, employeeId ? Number(employeeId) : null,
    categoryId ? Number(categoryId) : null, status === 'all' ? null : status];

  const { rows } = await pool.query(
    `WITH filtered AS (
       SELECT aps.service_id, aps.price_at_booking, a.technician_id
         FROM appointment_services aps
         JOIN appointments a ON a.id = aps.appointment_id
        WHERE ($1::date IS NULL OR a.appointment_date >= $1::date)
          AND ($2::date IS NULL OR a.appointment_date <= $2::date)
          AND ($3::int IS NULL OR a.technician_id = $3)
          AND ($5::text IS NULL OR a.status::text = $5)
     ),
     by_tech AS (
       SELECT service_id, technician_id, COUNT(*) AS cnt,
              RANK() OVER (PARTITION BY service_id ORDER BY COUNT(*) DESC) AS rnk
         FROM filtered
        WHERE technician_id IS NOT NULL
        GROUP BY service_id, technician_id
     )
     SELECT s.id, s.name, sc.name AS category,
            COUNT(f.*)::int AS "quantitySold",
            ROUND(COALESCE(AVG(f.price_at_booking), 0), 2)::float8 AS "averagePrice",
            COALESCE(SUM(f.price_at_booking), 0)::float8 AS "revenue",
            (SELECT u.name FROM by_tech bt JOIN users u ON u.id = bt.technician_id
              WHERE bt.service_id = s.id AND bt.rnk = 1 LIMIT 1) AS "topEmployeeName"
       FROM services s
       JOIN service_categories sc ON sc.id = s.category_id
       LEFT JOIN filtered f ON f.service_id = s.id
      WHERE ($4::int IS NULL OR s.category_id = $4)
      GROUP BY s.id, s.name, sc.name
     HAVING COUNT(f.*) > 0
      ORDER BY "revenue" DESC`,
    params
  );

  const totalQty = rows.reduce((s, r) => s + r.quantitySold, 0);
  const avgQty = rows.length > 0 ? totalQty / rows.length : 0;
  const mostRequested = rows.length > 0 ? [...rows].sort((a, b) => b.quantitySold - a.quantitySold)[0] : null;
  const mostProfitable = rows.length > 0 ? [...rows].sort((a, b) => b.revenue - a.revenue)[0] : null;
  const lowDemand = rows.filter((r) => r.quantitySold < avgQty).map((r) => r.name);

  return NextResponse.json({
    rows,
    indicators: {
      servicioMasSolicitado: mostRequested ? { name: mostRequested.name, quantity: mostRequested.quantitySold } : null,
      servicioMasRentable: mostProfitable ? { name: mostProfitable.name, revenue: round2(mostProfitable.revenue) } : null,
      serviciosBajaDemanda: lowDemand,
    },
  });
}
