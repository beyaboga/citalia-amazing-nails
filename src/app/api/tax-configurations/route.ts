import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Mantenimiento de impuestos (ISV, IVA, …). El cálculo de comisiones sobre precio
 * "sin impuestos" usa el impuesto ACTIVO configurado aquí, nunca un porcentaje fijo
 * en el código. Solo lo administra quien puede configurar la nómina.
 */
export async function GET() {
  const auth = await requirePermission('payroll.configure');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { rows } = await pool.query(
    `SELECT id, name, percentage::float8 AS percentage, is_active AS "isActive"
     FROM tax_configurations
     ORDER BY is_active DESC, name`
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('payroll.configure');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const percentage = Number(body?.percentage);
  const isActive = Boolean(body?.isActive);

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
  }
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return NextResponse.json({ error: 'El porcentaje debe estar entre 0 y 100' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // A lo sumo un impuesto activo: activar este desactiva los demás.
    if (isActive) {
      await client.query('UPDATE tax_configurations SET is_active = false WHERE is_active');
    }
    const { rows } = await client.query(
      `INSERT INTO tax_configurations (name, percentage, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, percentage::float8 AS percentage, is_active AS "isActive"`,
      [name, percentage, isActive]
    );
    await client.query('COMMIT');
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tax configuration:', error);
    return NextResponse.json({ error: 'Error al guardar el impuesto' }, { status: 500 });
  } finally {
    client.release();
  }
}
