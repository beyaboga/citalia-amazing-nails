import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Horario semanal de todo el personal reservable, más las ausencias y los días
 * no laborables del salón.
 *
 * El calendario lo usa para sombrear las horas en que un técnico no atiende.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { rows: schedules } = await pool.query(`
    SELECT
      tm.user_id AS "userId",
      s.day_of_week AS "dayOfWeek",
      s.enabled,
      COALESCE(
        json_agg(
          json_build_object(
            'start', to_char(slots.start_time, 'HH24:MI'),
            'end', to_char(slots.end_time, 'HH24:MI')
          ) ORDER BY slots.start_time
        ) FILTER (WHERE slots.id IS NOT NULL),
        '[]'
      ) AS slots
    FROM team_member_schedules s
    JOIN team_members tm ON tm.id = s.team_member_id
    LEFT JOIN team_member_schedule_slots slots ON slots.schedule_id = s.id
    GROUP BY tm.user_id, s.id
    ORDER BY tm.user_id, s.day_of_week
  `);

  const { rows: timeOff } = await pool.query(`
    SELECT
      tm.user_id AS "userId",
      to_char(t.start_date, 'YYYY-MM-DD') AS "startDate",
      to_char(t.end_date, 'YYYY-MM-DD') AS "endDate",
      t.type
    FROM team_member_time_off t
    JOIN team_members tm ON tm.id = t.team_member_id
    WHERE t.end_date >= CURRENT_DATE - INTERVAL '1 month'
  `);

  const { rows: closedDays } = await pool.query(`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, reason
    FROM non_working_days
    WHERE date >= CURRENT_DATE - INTERVAL '1 month'
  `);

  return NextResponse.json({ schedules, timeOff, closedDays });
}
