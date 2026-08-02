import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import type { TipType } from '@/lib/payments';

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const user = await getSession();
  if (!user) return { error: 'No autenticado', status: 401 as const };
  if (!hasPermission(user, 'settings.manage')) {
    return { error: 'No tiene permiso para configurar propinas', status: 403 as const };
  }
  return { user };
}

function validate(type: TipType, value: number): string | null {
  if (type !== 'PERCENTAGE' && type !== 'FIXED') return 'Tipo de propina no válido';
  if (!Number.isFinite(value) || value < 0) return 'El valor no puede ser negativo';
  if (type === 'PERCENTAGE' && value > 100) return 'El porcentaje no puede ser mayor a 100';
  return null;
}

/** PUT /api/tip-settings/[id] — editar una opción de propina. */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const tipId = Number(id);
  if (!Number.isInteger(tipId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const type = String(body?.type ?? '') as TipType;
  const value = Number(body?.value);

  const error = validate(type, value);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { rowCount } = await pool.query(
    `UPDATE tip_settings SET type = $1, value = $2, is_active = $3 WHERE id = $4`,
    [type, value, body?.isActive !== false, tipId]
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Opción no encontrada' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

/** DELETE /api/tip-settings/[id] — eliminar una opción de propina. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const tipId = Number(id);
  if (!Number.isInteger(tipId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  // Las opciones de propina no se referencian desde otras tablas (la propina real se
  // guarda con su monto en appointment_tips), así que se pueden borrar sin riesgo.
  const { rowCount } = await pool.query('DELETE FROM tip_settings WHERE id = $1', [tipId]);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'Opción no encontrada' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
