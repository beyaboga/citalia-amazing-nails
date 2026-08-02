import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Categorías de gasto. Las administra quien puede gestionar gastos
 * (`expenses.manage`, solo admin). El registro de gastos solo necesita leerlas.
 */
export async function GET() {
  const auth = await requirePermission('expenses.register');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.is_active AS "isActive",
            (SELECT COUNT(*) FROM expenses e WHERE e.expense_category_id = c.id)::int AS "usageCount"
       FROM expense_categories c
       ORDER BY c.name`
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('expenses.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const description = String(body?.description ?? '').trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO expense_categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, is_active AS "isActive"`,
      [name, description || null]
    );
    return NextResponse.json({ ...rows[0], usageCount: 0 }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense category:', error);
    return NextResponse.json({ error: 'Error al guardar la categoría' }, { status: 500 });
  }
}
