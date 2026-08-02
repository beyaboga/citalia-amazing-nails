import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tax-configurations/[id] — editar nombre/porcentaje y/o activar.
 * Activar uno desactiva a los demás (a lo sumo un impuesto activo), en una
 * sola transacción.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission('payroll.configure');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const taxId = Number(id);
  if (!Number.isInteger(taxId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const hasName = body?.name !== undefined;
  const hasPercentage = body?.percentage !== undefined;
  const hasActive = body?.isActive !== undefined;

  const name = hasName ? String(body.name).trim() : null;
  const percentage = hasPercentage ? Number(body.percentage) : null;
  const isActive = hasActive ? Boolean(body.isActive) : null;

  if (hasName && (!name || name.length < 2)) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
  }
  if (hasPercentage && (!Number.isFinite(percentage!) || percentage! < 0 || percentage! > 100)) {
    return NextResponse.json({ error: 'El porcentaje debe estar entre 0 y 100' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isActive === true) {
      await client.query('UPDATE tax_configurations SET is_active = false WHERE is_active AND id <> $1', [taxId]);
    }
    const { rowCount } = await client.query(
      `UPDATE tax_configurations
          SET name = COALESCE($2, name),
              percentage = COALESCE($3, percentage),
              is_active = COALESCE($4, is_active)
        WHERE id = $1`,
      [taxId, name, percentage, isActive]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Impuesto no encontrado' }, { status: 404 });
    }
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating tax configuration:', error);
    return NextResponse.json({ error: 'Error al actualizar el impuesto' }, { status: 500 });
  } finally {
    client.release();
  }
}
