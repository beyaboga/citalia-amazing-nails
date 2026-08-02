import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import type { TipType } from '@/lib/payments';

const SELECT = `
  SELECT id, type, value::float8 AS value,
         is_active AS "isActive", display_order AS "displayOrder"
  FROM tip_settings
`;

/**
 * GET /api/tip-settings — opciones de propina.
 * Autenticado: la pantalla de cobro las necesita para ofrecer los presets.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { rows } = await pool.query(`${SELECT} ORDER BY display_order, id`);
  return NextResponse.json(rows);
}

/** Valida tipo y valor; devuelve un mensaje de error o null. */
function validate(type: TipType, value: number): string | null {
  if (type !== 'PERCENTAGE' && type !== 'FIXED') return 'Tipo de propina no válido';
  if (!Number.isFinite(value) || value < 0) return 'El valor no puede ser negativo';
  if (type === 'PERCENTAGE' && value > 100) return 'El porcentaje no puede ser mayor a 100';
  return null;
}

/** POST /api/tip-settings — crear una opción de propina. */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'settings.manage')) {
    return NextResponse.json({ error: 'No tiene permiso para configurar propinas' }, { status: 403 });
  }

  const body = await request.json();
  const type = String(body?.type ?? '') as TipType;
  const value = Number(body?.value);

  const error = validate(type, value);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { rows: orderRows } = await pool.query(
    'SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM tip_settings'
  );

  const { rows } = await pool.query(
    `INSERT INTO tip_settings (type, value, is_active, display_order, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [type, value, body?.isActive !== false, orderRows[0].next, user.id]
  );

  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
