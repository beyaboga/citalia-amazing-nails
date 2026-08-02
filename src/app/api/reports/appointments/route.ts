import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const round2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

/**
 * GET /api/reports/appointments — una fila por línea de servicio de la cita.
 * "% completadas" (no "% de ocupación": eso requeriría un concepto de capacidad
 * disponible por técnica/día que este sistema no modela) = completadas sobre
 * completadas+canceladas+no_show.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('reports.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const employeeId = searchParams.get('employeeId');
  const serviceId = searchParams.get('serviceId');
  const categoryId = searchParams.get('categoryId');
  const status = searchParams.get('status');

  const params = [from || null, to || null, employeeId ? Number(employeeId) : null,
    serviceId ? Number(serviceId) : null, categoryId ? Number(categoryId) : null, status || null];

  const { rows } = await pool.query(
    `SELECT a.id AS "appointmentId", to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
            to_char(a.appointment_time, 'HH24:MI') AS time,
            c.name AS "customerName", s.name AS "serviceName", aps.duration_at_booking AS "durationMinutes",
            u.name AS "employeeName", a.status
       FROM appointment_services aps
       JOIN services s ON s.id = aps.service_id
       JOIN appointments a ON a.id = aps.appointment_id
       JOIN customers c ON c.id = a.customer_id
       LEFT JOIN users u ON u.id = a.technician_id
      WHERE ($1::date IS NULL OR a.appointment_date >= $1::date)
        AND ($2::date IS NULL OR a.appointment_date <= $2::date)
        AND ($3::int IS NULL OR a.technician_id = $3)
        AND ($4::int IS NULL OR aps.service_id = $4)
        AND ($5::int IS NULL OR s.category_id = $5)
        AND ($6::text IS NULL OR a.status::text = $6)
      ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
    params
  );

  const total = rows.length;
  const completadas = rows.filter((r) => r.status === 'completed').length;
  const canceladas = rows.filter((r) => r.status === 'cancelled').length;
  const noAsistio = rows.filter((r) => r.status === 'no_show').length;
  const base = completadas + canceladas + noAsistio;

  return NextResponse.json({
    rows,
    indicators: {
      total,
      completadas,
      canceladas,
      noAsistio,
      porcentajeCompletadas: base > 0 ? round2((completadas / base) * 100) : 0,
    },
  });
}
