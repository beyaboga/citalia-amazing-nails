import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT id, slug, name, description
    FROM roles
    ORDER BY id
  `);

  return NextResponse.json(rows);
}
