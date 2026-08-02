import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Reporte de pago por empleado: servicios realizados y total vendido (de citas
 * completadas), comisiones totales/pendientes/pagadas, sueldo fijo y total a pagar.
 * Las ventas salen de las citas completadas; las comisiones de commission_entries.
 */
export async function GET(request: Request) {
  // Nómina (sueldos) es información sensible: se ata al permiso de nómina, no al
  // genérico de reportes, para que no se filtre si algún día se comparten reportes.
  const auth = await requirePermission('payroll.configure');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const { rows } = await pool.query(
    `SELECT
       tm.id AS "teamMemberId",
       u.name,
       COALESCE(cfg.payment_scheme, 'FIXED') AS "paymentScheme",
       COALESCE(cfg.monthly_salary, 0)::float8 AS "monthlySalary",
       COALESCE(sales.services_count, 0) AS "servicesCount",
       COALESCE(sales.total_sold, 0)::float8 AS "totalSold",
       COALESCE(comm.total_commission, 0)::float8 AS "totalCommission",
       COALESCE(comm.pending, 0)::float8 AS "pendingCommission",
       COALESCE(comm.paid, 0)::float8 AS "paidCommission"
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     LEFT JOIN employee_payment_configs cfg ON cfg.team_member_id = tm.id
     LEFT JOIN LATERAL (
       SELECT COUNT(aps.*)::int AS services_count, SUM(aps.price_at_booking) AS total_sold
         FROM appointments a
         JOIN appointment_services aps ON aps.appointment_id = a.id
        WHERE a.technician_id = tm.user_id
          AND a.status = 'completed'
          AND ($1::date IS NULL OR a.appointment_date >= $1::date)
          AND ($2::date IS NULL OR a.appointment_date <= $2::date)
     ) sales ON true
     LEFT JOIN LATERAL (
       SELECT SUM(ce.commission_amount) AS total_commission,
              SUM(ce.commission_amount) FILTER (WHERE ce.status IN ('pending', 'approved')) AS pending,
              SUM(ce.commission_amount) FILTER (WHERE ce.status = 'paid') AS paid
         FROM commission_entries ce
        WHERE ce.team_member_id = tm.id
          AND ce.status <> 'voided'
          AND ($1::date IS NULL OR ce.calculated_at::date >= $1::date)
          AND ($2::date IS NULL OR ce.calculated_at::date <= $2::date)
     ) comm ON true
     ORDER BY u.name`,
    [from || null, to || null]
  );

  // Total a pagar = sueldo fijo + comisiones pendientes (aún no liquidadas).
  const report = rows.map((r) => ({
    ...r,
    totalToPay: Math.round((r.monthlySalary + r.pendingCommission) * 100) / 100,
  }));

  return NextResponse.json(report);
}
