import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/tips/[id]/distribute — reparte una propina entre empleadas.
 *
 * Acepta varias líneas { employeeId, amount }. Valida que lo repartido no supere el
 * monto de la propina (contando lo ya distribuido antes). Si al terminar queda
 * totalmente repartida, la propina pasa a DISTRIBUTED.
 */
export async function POST(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'tips.distribute')) {
    return NextResponse.json({ error: 'No tiene permiso para distribuir propinas' }, { status: 403 });
  }

  const { id } = await context.params;
  const tipId = Number(id);
  if (!Number.isInteger(tipId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const lines = Array.isArray(body?.distributions)
    ? body.distributions
        .map((d: any) => ({ employeeId: Number(d?.employeeId), amount: round2(Number(d?.amount)) }))
        .filter((d: any) => Number.isInteger(d.employeeId) && d.amount > 0)
    : [];

  if (lines.length === 0) {
    return NextResponse.json({ error: 'Indique al menos una empleada y un monto' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Se bloquea la propina para que dos repartos simultáneos no la excedan.
    const { rows: tipRows } = await client.query(
      'SELECT amount::float8 AS amount, status FROM appointment_tips WHERE id = $1 FOR UPDATE',
      [tipId]
    );
    if (tipRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Propina no encontrada' }, { status: 404 });
    }
    const tipAmount = round2(tipRows[0].amount);

    const { rows: distRows } = await client.query(
      'SELECT COALESCE(SUM(amount), 0)::float8 AS total FROM tip_distribution WHERE appointment_tip_id = $1',
      [tipId]
    );
    const already = round2(distRows[0].total);
    const adding = round2(lines.reduce((s: number, l: any) => s + l.amount, 0));

    if (already + adding > tipAmount + 0.001) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          error: `Lo repartido (L ${round2(already + adding)}) supera la propina (L ${tipAmount}). Quedan L ${round2(
            tipAmount - already
          )} por distribuir.`,
        },
        { status: 400 }
      );
    }

    // Las empleadas existen (team_members).
    const employeeIds = [...new Set(lines.map((l: any) => l.employeeId))];
    const { rows: empRows } = await client.query(
      'SELECT id FROM team_members WHERE id = ANY($1)',
      [employeeIds]
    );
    if (empRows.length !== employeeIds.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Una de las empleadas no es válida' }, { status: 400 });
    }

    for (const line of lines) {
      await client.query(
        `INSERT INTO tip_distribution (appointment_tip_id, employee_id, amount, distributed_by)
         VALUES ($1, $2, $3, $4)`,
        [tipId, line.employeeId, line.amount, user.id]
      );
    }

    // Si ya no queda nada por repartir, la propina queda distribuida.
    const newTotal = round2(already + adding);
    if (newTotal >= tipAmount - 0.01) {
      await client.query(
        "UPDATE appointment_tips SET status = 'DISTRIBUTED' WHERE id = $1",
        [tipId]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, distributed: newTotal, pending: round2(tipAmount - newTotal) });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
