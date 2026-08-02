import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/tips/summary — cuánto de propina le corresponde a cada empleada,
 * según lo ya distribuido. Solo con permiso para distribuir propinas.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'tips.distribute')) {
    return NextResponse.json({ error: 'No tiene permiso para ver propinas' }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get('from') || null;
  const to = url.searchParams.get('to') || null;

  const { rows } = await pool.query(
    `SELECT tm.id AS "employeeId", u.name AS "employeeName",
            SUM(td.amount)::float8 AS total,
            COUNT(*) AS "distributions"
     FROM tip_distribution td
     JOIN team_members tm ON tm.id = td.employee_id
     JOIN users u ON u.id = tm.user_id
     JOIN appointment_tips at ON at.id = td.appointment_tip_id
     JOIN appointments a ON a.id = at.appointment_id
     WHERE ($1::date IS NULL OR a.appointment_date >= $1::date)
       AND ($2::date IS NULL OR a.appointment_date <= $2::date)
     GROUP BY tm.id, u.name
     ORDER BY total DESC`,
    [from, to]
  );

  return NextResponse.json(rows);
}
