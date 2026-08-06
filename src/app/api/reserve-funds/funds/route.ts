import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Catálogo de Fondos Reservados. GET lista todos (sistema + personalizados) con el
 * saldo del período ABIERTO actual (los fondos arrancan en L0 cada mes — ver
 * [[reserve_funds_module]]). POST crea un fondo personalizado.
 */
export async function GET() {
  const auth = await requirePermission('funds.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await pool.query('SELECT close_elapsed_financial_periods()');
  const { rows: periodRows } = await pool.query(
    'SELECT get_or_create_financial_period(CURRENT_DATE) AS id'
  );
  const periodId = periodRows[0].id;

  const { rows } = await pool.query(
    `SELECT
       rf.id, rf.name, rf.kind, rf.reservation_type AS "reservationType",
       rf.reservation_value::float8 AS "reservationValue",
       rf.is_system AS "isSystem", rf.is_active AS "isActive", rf.display_order AS "displayOrder",
       COALESCE(SUM(CASE
         WHEN fm.voided_at IS NOT NULL OR fm.financial_period_id IS DISTINCT FROM $1 THEN 0
         WHEN fm.direction = 'IN' THEN fm.amount
         ELSE -fm.amount
       END), 0)::float8 AS "currentPeriodBalance"
     FROM reserve_funds rf
     LEFT JOIN fund_movements fm ON fm.fund_id = rf.id
     GROUP BY rf.id
     ORDER BY rf.display_order, rf.id`,
    [periodId]
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('funds.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const reservationType = String(body?.reservationType ?? '');
  const reservationValueRaw = body?.reservationValue;

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: 'El nombre del fondo debe tener al menos 2 caracteres' },
      { status: 400 }
    );
  }
  if (
    !['FIXED_AMOUNT', 'PERCENTAGE', 'SERVICE_COST', 'COMMISSION_BASED', 'MANUAL_ONLY'].includes(
      reservationType
    )
  ) {
    return NextResponse.json({ error: 'Tipo de reserva inválido' }, { status: 400 });
  }

  let reservationValue: number | null = null;
  if (reservationType === 'FIXED_AMOUNT' || reservationType === 'PERCENTAGE') {
    reservationValue = Number(reservationValueRaw);
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

  try {
    const { rows } = await pool.query(
      `INSERT INTO reserve_funds (name, kind, reservation_type, reservation_value, is_system, is_active, created_by)
       VALUES ($1, 'CUSTOM', $2, $3, false, true, $4)
       RETURNING
         id, name, kind, reservation_type AS "reservationType",
         reservation_value::float8 AS "reservationValue",
         is_system AS "isSystem", is_active AS "isActive", display_order AS "displayOrder"`,
      [name, reservationType, reservationValue, auth.user.id]
    );
    return NextResponse.json({ ...rows[0], currentPeriodBalance: 0 }, { status: 201 });
  } catch (error) {
    console.error('Error creating reserve fund:', error);
    return NextResponse.json({ error: 'Error al crear el fondo' }, { status: 500 });
  }
}
