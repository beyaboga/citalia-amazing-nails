import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { buildTipSuggestion } from '@/lib/tips';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/tips/[id]/suggestion — reparto sugerido de una propina entre las técnicas
 * que atendieron la visita (proporcional a lo que cobró cada una), para precargar el
 * formulario de distribución.
 */
export async function GET(_request: Request, context: RouteContext) {
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

  const suggestion = await buildTipSuggestion(pool, tipId);
  if (!suggestion) return NextResponse.json({ error: 'Propina no encontrada' }, { status: 404 });
  return NextResponse.json(suggestion);
}
