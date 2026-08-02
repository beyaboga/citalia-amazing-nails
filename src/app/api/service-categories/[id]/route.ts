import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('services.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      return NextResponse.json({ error: 'El nombre de la categoría es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
    }
    fields.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (body.icon !== undefined) {
    fields.push(`icon = $${paramIndex++}`);
    values.push(body.icon ? String(body.icon).trim() : null);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE service_categories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, icon`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    console.error('Error updating service category:', error);
    return NextResponse.json({ error: 'Error al actualizar la categoría' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('services.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  try {
    const { rowCount } = await pool.query('DELETE FROM service_categories WHERE id = $1', [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar: hay servicios que usan esta categoría' },
        { status: 409 }
      );
    }
    console.error('Error deleting service category:', error);
    return NextResponse.json({ error: 'Error al eliminar la categoría' }, { status: 500 });
  }
}
