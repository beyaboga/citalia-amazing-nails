import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * Motivos del cambio manual de precio. Solo los ve y administra quien puede
 * modificar precios (`pricing.modify`), porque solo ahí se usan.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'pricing.modify')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.is_active AS "isActive",
            (SELECT COUNT(*) FROM appointment_price_history h WHERE h.reason = r.name)::int AS "usageCount"
     FROM price_change_reasons r
     ORDER BY r.name`
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'pricing.modify')) {
    return NextResponse.json({ error: 'No tiene permiso para agregar motivos' }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El motivo debe tener al menos 2 caracteres' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO price_change_reasons (name) VALUES ($1) RETURNING id, name, is_active AS "isActive"',
      [name]
    );
    return NextResponse.json({ ...rows[0], usageCount: 0 }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un motivo con ese nombre' }, { status: 409 });
    }
    console.error('Error creating price change reason:', error);
    return NextResponse.json({ error: 'Error al guardar el motivo' }, { status: 500 });
  }
}
