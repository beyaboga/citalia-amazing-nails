import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

async function requireManager() {
  const user = await getSession();
  if (!user) return { error: 'No autenticado', status: 401 as const };
  if (!hasPermission(user, 'pricing.modify')) {
    return { error: 'No tiene permiso para gestionar motivos', status: 403 as const };
  }
  return { user };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const reasonId = Number(id);
  if (!Number.isInteger(reasonId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El motivo debe tener al menos 2 caracteres' }, { status: 400 });
  }

  try {
    const { rowCount } = await pool.query('UPDATE price_change_reasons SET name = $2 WHERE id = $1', [
      reasonId,
      name,
    ]);
    if (rowCount === 0) return NextResponse.json({ error: 'Motivo no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un motivo con ese nombre' }, { status: 409 });
    }
    console.error('Error updating price change reason:', error);
    return NextResponse.json({ error: 'Error al actualizar el motivo' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const reasonId = Number(id);
  if (!Number.isInteger(reasonId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  // El historial guarda el nombre del motivo como texto, así que borrar el catálogo
  // no rompe la auditoría existente.
  const { rowCount } = await pool.query('DELETE FROM price_change_reasons WHERE id = $1', [reasonId]);
  if (rowCount === 0) return NextResponse.json({ error: 'Motivo no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
