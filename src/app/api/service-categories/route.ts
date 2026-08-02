import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      sc.id,
      sc.name,
      sc.icon,
      COUNT(s.id)::int AS "serviceCount"
    FROM service_categories sc
    LEFT JOIN services s ON s.category_id = sc.id
    GROUP BY sc.id
    ORDER BY sc.name
  `);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('services.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const icon = body?.icon ? String(body.icon).trim() : null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El nombre de la categoría es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO service_categories (name, icon) VALUES ($1, $2) RETURNING id, name, icon',
      [name, icon]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    console.error('Error creating service category:', error);
    return NextResponse.json({ error: 'Error al guardar la categoría' }, { status: 500 });
  }
}
