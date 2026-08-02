import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows } = await pool.query(
    `
    SELECT
      cn.id,
      cn.content,
      COALESCE(u.name, 'Usuario Admin') AS author,
      to_char(cn.created_at, 'DD/MM/YYYY') AS date,
      to_char(cn.created_at, 'HH12:MI AM') AS time
    FROM customer_notes cn
    LEFT JOIN users u ON u.id = cn.author_id
    WHERE cn.customer_id = $1
    ORDER BY cn.created_at DESC
    `,
    [id]
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const content = String(body?.content ?? '').trim();

  if (!content) {
    return NextResponse.json({ error: 'La nota no puede estar vacía' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO customer_notes (customer_id, content)
       VALUES ($1, $2)
       RETURNING
         id, content, 'Usuario Admin' AS author,
         to_char(created_at, 'DD/MM/YYYY') AS date,
         to_char(created_at, 'HH12:MI AM') AS time`,
      [id, content]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    console.error('Error creating customer note:', error);
    return NextResponse.json({ error: 'Error al guardar la nota' }, { status: 500 });
  }
}
