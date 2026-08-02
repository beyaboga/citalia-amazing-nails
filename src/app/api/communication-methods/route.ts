import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      cm.id,
      cm.name,
      cm.icon,
      COALESCE(usage.customer_count, 0)::int AS "customerCount"
    FROM communication_methods cm
    LEFT JOIN (
      SELECT unnest(preferred_contact_methods) AS method_name, COUNT(*) AS customer_count
      FROM customers
      GROUP BY method_name
    ) usage ON usage.method_name = cm.name
    ORDER BY cm.name
  `);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const icon = body?.icon ? String(body.icon).trim() : null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El nombre es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO communication_methods (name, icon) VALUES ($1, $2) RETURNING id, name, icon',
      [name, icon]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un método de contacto con ese nombre' }, { status: 409 });
    }
    console.error('Error creating communication method:', error);
    return NextResponse.json({ error: 'Error al guardar el método de contacto' }, { status: 500 });
  }
}
