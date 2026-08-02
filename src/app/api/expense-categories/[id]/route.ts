import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/expense-categories/[id] — editar nombre/descripción y/o activar/desactivar. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission('expenses.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const hasName = body?.name !== undefined;
  const hasDescription = body?.description !== undefined;
  const hasActive = body?.isActive !== undefined;

  const name = hasName ? String(body.name).trim() : null;
  const description = hasDescription ? String(body.description).trim() : null;
  const isActive = hasActive ? Boolean(body.isActive) : null;

  if (hasName && (!name || name.length < 2)) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `UPDATE expense_categories
        SET name = COALESCE($2, name),
            description = CASE WHEN $3::boolean THEN $4 ELSE description END,
            is_active = COALESCE($5, is_active)
      WHERE id = $1`,
    [categoryId, name, hasDescription, description, isActive]
  );
  if (rowCount === 0) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  return NextResponse.json({ success: true });
}
