import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Configuración del seguimiento de clientes (singleton): días de anticipación
 * para marcar "🟡 Próxima" y el multiplicador para considerar "perdido".
 */
export async function GET() {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { rows } = await pool.query(
    `SELECT upcoming_window_days AS "upcomingWindowDays", lost_multiplier::float8 AS "lostMultiplier"
       FROM customer_followup_settings WHERE id = 1`
  );
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const upcomingWindowDays = Number(body?.upcomingWindowDays);
  const lostMultiplier = Number(body?.lostMultiplier);

  if (!Number.isInteger(upcomingWindowDays) || upcomingWindowDays < 0) {
    return NextResponse.json({ error: 'Los días de anticipación deben ser un número entero, 0 o mayor' }, { status: 400 });
  }
  if (!Number.isFinite(lostMultiplier) || lostMultiplier <= 0) {
    return NextResponse.json({ error: 'El multiplicador de "perdido" debe ser mayor a 0' }, { status: 400 });
  }

  await pool.query(
    `UPDATE customer_followup_settings
        SET upcoming_window_days = $1, lost_multiplier = $2, updated_by = $3
      WHERE id = 1`,
    [upcomingWindowDays, lostMultiplier, auth.user.id]
  );
  return NextResponse.json({ success: true });
}
