import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const round2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

/**
 * GET /api/reports/sales — una fila por pago no anulado, con sus indicadores.
 * "Ventas totales" excluye propina (mismo criterio que /api/dashboard: el ingreso
 * del salón es el servicio, la propina se registra aparte).
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
  const methodId = searchParams.get('methodId');
  const status = searchParams.get('status') || 'completed';

  const params = [from || null, to || null, employeeId ? Number(employeeId) : null,
    status === 'all' ? null : status, serviceId ? Number(serviceId) : null,
    categoryId ? Number(categoryId) : null, methodId ? Number(methodId) : null];

  const { rows } = await pool.query(
    `SELECT p.id AS "paymentId", to_char(p.created_at, 'YYYY-MM-DD') AS date,
            a.id AS "appointmentId", c.name AS "customerName", u.name AS "employeeName",
            (SELECT STRING_AGG(s2.name, ', ' ORDER BY s2.name)
               FROM appointment_services aps2 JOIN services s2 ON s2.id = aps2.service_id
              WHERE aps2.appointment_id = a.id) AS services,
            p.subtotal::float8 AS "originalPrice", p.discount_amount::float8 AS "discountAmount",
            (p.total_amount - p.tip_amount)::float8 AS "finalPrice", p.tip_amount::float8 AS "tipAmount",
            (SELECT STRING_AGG(DISTINCT pm.name, ', ')
               FROM payment_details pd JOIN payment_methods pm ON pm.id = pd.payment_method_id
              WHERE pd.payment_id = p.id) AS "paymentMethods",
            p.paid_amount::float8 AS "totalReceived", a.status
       FROM payments p
       JOIN appointments a ON a.id = p.appointment_id
       JOIN customers c ON c.id = p.customer_id
       LEFT JOIN users u ON u.id = a.technician_id
      WHERE p.voided_at IS NULL
        AND ($1::date IS NULL OR p.created_at::date >= $1::date)
        AND ($2::date IS NULL OR p.created_at::date <= $2::date)
        AND ($3::int IS NULL OR a.technician_id = $3)
        AND ($4::text IS NULL OR a.status::text = $4)
        AND ($5::int IS NULL OR EXISTS (
              SELECT 1 FROM appointment_services aps3 WHERE aps3.appointment_id = a.id AND aps3.service_id = $5))
        AND ($6::int IS NULL OR EXISTS (
              SELECT 1 FROM appointment_services aps4 JOIN services s4 ON s4.id = aps4.service_id
               WHERE aps4.appointment_id = a.id AND s4.category_id = $6))
        AND ($7::int IS NULL OR EXISTS (
              SELECT 1 FROM payment_details pd2 WHERE pd2.payment_id = p.id AND pd2.payment_method_id = $7))
      ORDER BY p.created_at DESC`,
    params
  );

  const ventasTotales = round2(rows.reduce((s, r) => s + r.finalPrice, 0));
  const clientesDistintos = new Set(rows.map((r) => r.customerName)).size;
  const promedioPorCliente = clientesDistintos > 0 ? round2(ventasTotales / clientesDistintos) : 0;

  const serviceCounts = new Map<string, number>();
  rows.forEach((r) => {
    (r.services ?? '').split(', ').filter(Boolean).forEach((s: string) => {
      serviceCounts.set(s, (serviceCounts.get(s) ?? 0) + 1);
    });
  });
  let topService: string | null = null;
  let topServiceCount = 0;
  serviceCounts.forEach((count, name) => {
    if (count > topServiceCount) { topService = name; topServiceCount = count; }
  });

  const dayTotals = new Map<string, number>();
  rows.forEach((r) => dayTotals.set(r.date, (dayTotals.get(r.date) ?? 0) + r.finalPrice));
  let topDay: string | null = null;
  let topDayTotal = 0;
  dayTotals.forEach((total, date) => {
    if (total > topDayTotal) { topDay = date; topDayTotal = total; }
  });

  return NextResponse.json({
    rows,
    indicators: {
      ventasTotales,
      promedioPorCliente,
      cantidadCitas: rows.length,
      servicioMasVendido: topService,
      diaMayoresIngresos: topDay ? { date: topDay, total: round2(topDayTotal) } : null,
    },
  });
}
