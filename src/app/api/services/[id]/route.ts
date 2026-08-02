import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT
       id::text AS id,
       name,
       description,
       category_id AS "categoryId",
       price::float8 AS price,
       duration_minutes AS duration,
       is_active AS "isActive",
       special_requirements AS "specialRequirements",
       image_url AS image,
       image_alt AS "imageAlt"
     FROM services WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

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
    if (name.length < 3) {
      return NextResponse.json({ error: 'El nombre del servicio es obligatorio (mínimo 3 caracteres)' }, { status: 400 });
    }
    fields.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (description.length < 10) {
      return NextResponse.json({ error: 'La descripción es obligatoria (mínimo 10 caracteres)' }, { status: 400 });
    }
    fields.push(`description = $${paramIndex++}`);
    values.push(description);
  }

  if (body.categoryId !== undefined) {
    fields.push(`category_id = $${paramIndex++}`);
    values.push(Number(body.categoryId));
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!(price > 0)) {
      return NextResponse.json({ error: 'El precio debe ser mayor a 0' }, { status: 400 });
    }
    fields.push(`price = $${paramIndex++}`);
    values.push(price);
  }

  if (body.durationMinutes !== undefined) {
    const duration = Number(body.durationMinutes);
    if (!(duration > 0) || duration > 720) {
      return NextResponse.json({ error: 'La duración debe estar entre 1 minuto y 12 horas' }, { status: 400 });
    }
    fields.push(`duration_minutes = $${paramIndex++}`);
    values.push(duration);
  }

  if (body.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(Boolean(body.isActive));
  }

  if (body.specialRequirements !== undefined) {
    fields.push(`special_requirements = $${paramIndex++}`);
    values.push(body.specialRequirements ? String(body.specialRequirements).trim() : null);
  }

  if (body.imageUrl !== undefined) {
    fields.push(`image_url = $${paramIndex++}`);
    values.push(body.imageUrl || null);
  }

  if (body.imageAlt !== undefined) {
    fields.push(`image_alt = $${paramIndex++}`);
    values.push(body.imageAlt || null);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE services SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id::text AS id, is_active AS "isActive"`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json({ error: 'La categoría seleccionada no existe' }, { status: 400 });
    }
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Error al actualizar el servicio' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('services.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  try {
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar: el servicio está en uso en citas o preferencias de clientes' },
        { status: 409 }
      );
    }
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Error al eliminar el servicio' }, { status: 500 });
  }
}
