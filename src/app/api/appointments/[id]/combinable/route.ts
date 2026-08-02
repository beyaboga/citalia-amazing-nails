import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { findCombinable } from '@/lib/combinedCheckout';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/[id]/combinable — otras citas del mismo cliente el mismo
 * día, sin cobrar, que se pueden pagar junto con esta (para el cobro combinado).
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para cobrar citas' }, { status: 403 });
  }

  const { id } = await context.params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const candidates = await findCombinable(pool, appointmentId);
  return NextResponse.json(candidates);
}
