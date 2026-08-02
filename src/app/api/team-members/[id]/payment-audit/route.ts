import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/team-members/[id]/payment-audit — bitácora de cambios al esquema de pago
 * y comisiones de un empleado. Solo quien puede configurar nómina. `id` es el userId.
 */
export async function GET(_request: Request, context: RouteContext) {
  const authz = await requirePermission('payroll.configure');
  if ('error' in authz) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT a.id,
            a.change_type AS "changeType",
            u.name AS "changedBy",
            a.before,
            a.after,
            to_char(a.created_at, 'YYYY-MM-DD HH24:MI') AS "changedAt"
       FROM employee_payment_audit a
       JOIN team_members tm ON tm.id = a.team_member_id
       LEFT JOIN users u ON u.id = a.changed_by
      WHERE tm.user_id = $1
      ORDER BY a.created_at DESC`,
    [userId]
  );

  return NextResponse.json(rows);
}
