import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { PAYMENT_METHOD_TYPES, type PaymentMethodType } from '@/lib/payments';

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const user = await getSession();
  if (!user) return { error: 'No autenticado', status: 401 as const };
  if (!hasPermission(user, 'settings.manage')) {
    return { error: 'No tiene permiso para configurar métodos de pago', status: 403 as const };
  }
  return { user };
}

/** PUT /api/payment-methods/[id] — editar un método (no los del sistema). */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const methodId = Number(id);
  if (!Number.isInteger(methodId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows: existing } = await pool.query(
    'SELECT is_system FROM payment_methods WHERE id = $1',
    [methodId]
  );
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Método no encontrado' }, { status: 404 });
  }
  // "Dividir pago" no requiere configuración: no se edita.
  if (existing[0].is_system) {
    return NextResponse.json(
      { error: 'El método "Dividir pago" es del sistema y no se puede editar' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const type = String(body?.type ?? '') as PaymentMethodType;

  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  if (!PAYMENT_METHOD_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tipo de método no válido' }, { status: 400 });
  }

  const bank = String(body?.bank ?? '').trim() || null;
  const account = String(body?.account ?? '').trim() || null;
  const isActive = body?.isActive !== false;
  const isDefault = Boolean(body?.isDefault);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (isDefault) {
      await client.query('UPDATE payment_methods SET is_default = false WHERE is_default AND id <> $1', [
        methodId,
      ]);
    }

    await client.query(
      `UPDATE payment_methods
          SET name = $1, type = $2, bank = $3, account = $4, is_active = $5, is_default = $6
        WHERE id = $7`,
      [name, type, bank, account, isActive, isDefault, methodId]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** DELETE /api/payment-methods/[id] — eliminar un método. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const methodId = Number(id);
  if (!Number.isInteger(methodId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM payment_methods WHERE id = $1', [methodId]);
    if (rowCount === 0) {
      return NextResponse.json({ error: 'Método no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // El trigger de la base bloquea borrar el método del sistema.
    if (error?.message?.includes('del sistema')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // 23503: hay pagos que ya usaron este método. No se borra; se desactiva.
    if (error?.code === '23503') {
      return NextResponse.json(
        { error: 'Este método ya se usó en pagos. Desactívelo en lugar de eliminarlo.' },
        { status: 409 }
      );
    }
    throw error;
  }
}
