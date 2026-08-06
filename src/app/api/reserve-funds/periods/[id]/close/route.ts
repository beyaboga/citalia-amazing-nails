import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/** Cierre manual anticipado de un período (el cierre normal es perezoso, al pasar
 * de mes). Una vez cerrado ya no admite aportes manuales, pero las reservas
 * automáticas de pagos reales de ese mes se siguen registrando con exactitud si
 * llegan tarde. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('funds.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const { rows } = await pool.query(
    `UPDATE financial_periods
        SET status = 'CLOSED', closed_at = now(), closed_by = $2
      WHERE id = $1 AND status = 'OPEN'
      RETURNING id, status, closed_at`,
    [id, auth.user.id]
  );

  if (rows.length === 0) {
    const { rows: check } = await pool.query('SELECT id FROM financial_periods WHERE id = $1', [
      id,
    ]);
    if (check.length === 0)
      return NextResponse.json({ error: 'Período no encontrado' }, { status: 404 });
    return NextResponse.json({ error: 'El período ya está cerrado' }, { status: 400 });
  }

  return NextResponse.json(rows[0]);
}
