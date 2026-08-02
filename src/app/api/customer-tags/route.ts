import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query('SELECT id, name FROM customer_tags ORDER BY name');
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body?.name ?? '').trim();

  if (!name) {
    return NextResponse.json({ error: 'El nombre de la etiqueta es obligatorio' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO customer_tags (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      const { rows } = await pool.query('SELECT id, name FROM customer_tags WHERE name = $1', [name]);
      return NextResponse.json(rows[0]);
    }
    console.error('Error creating customer tag:', error);
    return NextResponse.json({ error: 'Error al guardar la etiqueta' }, { status: 500 });
  }
}
