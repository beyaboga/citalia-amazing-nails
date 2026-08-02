import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  let newName: string | undefined;

  if (body.name !== undefined) {
    newName = String(body.name).trim();
    if (newName.length < 2) {
      return NextResponse.json({ error: 'El nombre es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
    }
    fields.push(`name = $${paramIndex++}`);
    values.push(newName);
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
    const { rows: existingRows } = await pool.query('SELECT name FROM communication_methods WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Método de contacto no encontrado' }, { status: 404 });
    }
    const oldName = existingRows[0].name;

    const { rows } = await pool.query(
      `UPDATE communication_methods SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, icon`,
      values
    );

    if (newName && newName !== oldName) {
      await pool.query(
        `UPDATE customers
         SET preferred_contact_methods = array_replace(preferred_contact_methods, $1, $2)
         WHERE $1 = ANY(preferred_contact_methods)`,
        [oldName, newName]
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un método de contacto con ese nombre' }, { status: 409 });
    }
    console.error('Error updating communication method:', error);
    return NextResponse.json({ error: 'Error al actualizar el método de contacto' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows: methodRows } = await pool.query('SELECT name FROM communication_methods WHERE id = $1', [id]);
  if (methodRows.length === 0) {
    return NextResponse.json({ error: 'Método de contacto no encontrado' }, { status: 404 });
  }

  const { rows: usageRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM customers WHERE $1 = ANY(preferred_contact_methods)',
    [methodRows[0].name]
  );

  if (usageRows[0].count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${usageRows[0].count} cliente(s) tienen este método seleccionado` },
      { status: 409 }
    );
  }

  await pool.query('DELETE FROM communication_methods WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
