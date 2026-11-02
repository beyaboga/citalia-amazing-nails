import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const round2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

/**
 * GET /api/reports/no-shows?from=&to= — clientas que no asistieron a su cita en el período.
 *
 * Una fila por clienta con al menos una inasistencia. La tasa se mide sobre las citas
 * que sí "se jugaron" (atendidas + no asistió): una cita cancelada con aviso no es una
 * inasistencia, así que no entra en la base. El dinero perdido es el total agendado de
 * esas citas (lo que se habría cobrado de haber asistido).
 */
export async function GET(request: Request) {
  const auth = await requirePermission('reports.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;

  const { rows } = await pool.query(
    `SELECT c.id AS "customerId", c.name AS "customerName", c.phone AS "customerPhone",
            COUNT(*) FILTER (WHERE a.status::text = 'no_show')::int AS "noShows",
            COUNT(*) FILTER (WHERE a.status::text = 'completed')::int AS completed,
            COUNT(*) FILTER (WHERE a.status::text = 'cancelled')::int AS cancelled,
            COALESCE(SUM(a.total_price) FILTER (WHERE a.status::text = 'no_show'), 0)::float8 AS "lostAmount",
            to_char(MAX(a.appointment_date) FILTER (WHERE a.status::text = 'no_show'), 'YYYY-MM-DD') AS "lastNoShow"
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
      WHERE ($1::date IS NULL OR a.appointment_date >= $1::date)
        AND ($2::date IS NULL OR a.appointment_date <= $2::date)
        AND a.status::text IN ('completed', 'no_show', 'cancelled')
      GROUP BY c.id, c.name, c.phone
     HAVING COUNT(*) FILTER (WHERE a.status::text = 'no_show') > 0
      ORDER BY "noShows" DESC, "lostAmount" DESC, c.name`,
    [from, to]
  );

  const { rows: totals } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status::text = 'no_show')::int AS "noShows",
            COUNT(*) FILTER (WHERE status::text = 'completed')::int AS completed,
            COALESCE(SUM(total_price) FILTER (WHERE status::text = 'no_show'), 0)::float8 AS "lostAmount"
       FROM appointments
      WHERE ($1::date IS NULL OR appointment_date >= $1::date)
        AND ($2::date IS NULL OR appointment_date <= $2::date)`,
    [from, to]
  );

  const t = totals[0];
  const base = t.noShows + t.completed;

  const customers = rows.map((r) => {
    const customerBase = r.noShows + r.completed;
    return { ...r, noShowRate: customerBase > 0 ? round2((r.noShows / customerBase) * 100) : 0 };
  });

  return NextResponse.json({
    rows: customers,
    indicators: {
      noShows: t.noShows,
      noShowRate: base > 0 ? round2((t.noShows / base) * 100) : 0,
      lostAmount: round2(t.lostAmount),
      customersAffected: customers.length,
      repeatCustomers: customers.filter((r) => r.noShows >= 2).length,
    },
  });
}
