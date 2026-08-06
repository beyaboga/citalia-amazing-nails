import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/** Editar / eliminar un fondo personalizado. Los 2 fondos de sistema están
 * protegidos también a nivel de base (trg_reserve_funds_no_delete_system /
 * trg_reserve_funds_no_retype_system) — aquí solo evitamos el viaje redondo. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('funds.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();

  const { rows: existingRows } = await pool.query(
    'SELECT is_system AS "isSystem" FROM reserve_funds WHERE id = $1',
    [id]
  );
  if (existingRows.length === 0) {
    return NextResponse.json({ error: 'Fondo no encontrado' }, { status: 404 });
  }
  if (
    existingRows[0].isSystem &&
    (body.reservationType !== undefined || body.reservationValue !== undefined)
  ) {
    return NextResponse.json(
      { error: 'El fondo es del sistema y no se puede reconfigurar' },
      { status: 400 }
    );
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2)
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    fields.push(`name = $${i++}`);
    values.push(name);
  }

  if (body.isActive !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(Boolean(body.isActive));
  }

  if (body.reservationType !== undefined) {
    const reservationType = String(body.reservationType);
    if (
      !['FIXED_AMOUNT', 'PERCENTAGE', 'SERVICE_COST', 'COMMISSION_BASED', 'MANUAL_ONLY'].includes(
        reservationType
      )
    ) {
      return NextResponse.json({ error: 'Tipo de reserva inválido' }, { status: 400 });
    }
    let reservationValue: number | null = null;
    if (reservationType === 'FIXED_AMOUNT' || reservationType === 'PERCENTAGE') {
      reservationValue = Number(body.reservationValue);
      if (!Number.isFinite(reservationValue) || reservationValue < 0) {
        return NextResponse.json(
          { error: 'El valor de la reserva debe ser mayor o igual a 0' },
          { status: 400 }
        );
      }
      if (reservationType === 'PERCENTAGE' && reservationValue > 100) {
        return NextResponse.json(
          { error: 'El porcentaje no puede ser mayor a 100' },
          { status: 400 }
        );
      }
    }
    fields.push(`reservation_type = $${i++}`);
    values.push(reservationType);
    fields.push(`reservation_value = $${i++}`);
    values.push(reservationValue);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE reserve_funds SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, kind, reservation_type AS "reservationType",
         reservation_value::float8 AS "reservationValue", is_system AS "isSystem", is_active AS "isActive"`,
      values
    );
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating reserve fund:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar el fondo' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('funds.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  try {
    const { rowCount } = await pool.query('DELETE FROM reserve_funds WHERE id = $1', [id]);
    if (rowCount === 0) return NextResponse.json({ error: 'Fondo no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P0001') {
      // RAISE EXCEPTION de trg_reserve_funds_no_delete_system.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === '23503') {
      return NextResponse.json(
        { error: 'No se puede eliminar: el fondo tiene movimientos registrados' },
        { status: 409 }
      );
    }
    console.error('Error deleting reserve fund:', error);
    return NextResponse.json({ error: 'Error al eliminar el fondo' }, { status: 500 });
  }
}
