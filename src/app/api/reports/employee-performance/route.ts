import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const round2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

/**
 * GET /api/reports/employee-performance — una fila por empleada reservable:
 * servicios, clientes atendidos, ingresos, comisión, propinas, ticket promedio.
 * Mismas fuentes que /api/reports/services (ventas) y /api/reports/payroll
 * (comisión); agrega tip_distribution, no usada todavía en ningún reporte.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('reports.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status') || 'completed';

  const params = [from || null, to || null, status === 'all' ? null : status];

  const { rows } = await pool.query(
    `WITH qualifying AS (
       SELECT a.id AS appointment_id, a.customer_id, a.technician_id
         FROM appointments a
        WHERE ($1::date IS NULL OR a.appointment_date >= $1::date)
          AND ($2::date IS NULL OR a.appointment_date <= $2::date)
          AND ($3::text IS NULL OR a.status::text = $3)
     ),
     service_stats AS (
       SELECT q.technician_id,
              COUNT(*) AS services_count,
              COALESCE(SUM(aps.price_at_booking), 0) AS revenue,
              COUNT(DISTINCT q.appointment_id) AS appointments_count,
              COUNT(DISTINCT q.customer_id) AS customers_count
         FROM appointment_services aps JOIN qualifying q ON q.appointment_id = aps.appointment_id
        GROUP BY q.technician_id
     ),
     commission_stats AS (
       SELECT team_member_id, COALESCE(SUM(commission_amount), 0) AS commission
         FROM commission_entries
        WHERE status <> 'voided'
          AND ($1::date IS NULL OR calculated_at::date >= $1::date)
          AND ($2::date IS NULL OR calculated_at::date <= $2::date)
        GROUP BY team_member_id
     ),
     tip_stats AS (
       SELECT employee_id, COALESCE(SUM(amount), 0) AS tips
         FROM tip_distribution
        WHERE ($1::date IS NULL OR distribution_date::date >= $1::date)
          AND ($2::date IS NULL OR distribution_date::date <= $2::date)
        GROUP BY employee_id
     )
     SELECT tm.id AS "teamMemberId", u.name,
            COALESCE(ss.services_count, 0)::int AS "servicesCount",
            COALESCE(ss.customers_count, 0)::int AS "customersCount",
            COALESCE(ss.revenue, 0)::float8 AS "revenue",
            COALESCE(cs.commission, 0)::float8 AS "commission",
            COALESCE(ts.tips, 0)::float8 AS "tips",
            CASE WHEN COALESCE(ss.appointments_count, 0) > 0
                 THEN ROUND(ss.revenue / ss.appointments_count, 2) ELSE 0 END::float8 AS "ticketAverage"
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN service_stats ss ON ss.technician_id = u.id
       LEFT JOIN commission_stats cs ON cs.team_member_id = tm.id
       LEFT JOIN tip_stats ts ON ts.employee_id = tm.id
      ORDER BY "revenue" DESC`,
    params
  );

  const topRevenue = rows.length > 0 ? [...rows].sort((a, b) => b.revenue - a.revenue)[0] : null;
  const topServices = rows.length > 0 ? [...rows].sort((a, b) => b.servicesCount - a.servicesCount)[0] : null;
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  let dayCount = 1;
  if (from && to) {
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    dayCount = Math.max(1, days);
  }

  return NextResponse.json({
    rows,
    indicators: {
      empleadaMayorVenta: topRevenue && topRevenue.revenue > 0 ? { name: topRevenue.name, revenue: round2(topRevenue.revenue) } : null,
      empleadaMasServicios: topServices && topServices.servicesCount > 0 ? { name: topServices.name, count: topServices.servicesCount } : null,
      promedioIngresosDiarios: round2(totalRevenue / dayCount),
    },
  });
}
