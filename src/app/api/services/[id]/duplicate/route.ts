import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const DEFAULT_IMAGE = '/assets/images/no_image.png';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('services.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const inserted = await pool.query(
    `INSERT INTO services (category_id, name, description, price, duration_minutes, is_active, image_url, image_alt, special_requirements)
     SELECT category_id, name || ' (Copia)', description, price, duration_minutes, is_active, image_url, image_alt, special_requirements
     FROM services WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (inserted.rows.length === 0) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT
       s.id::text AS id,
       s.name,
       sc.name AS category,
       s.price::float8 AS price,
       s.duration_minutes AS duration,
       s.is_active AS "isActive",
       COALESCE(s.image_url, '${DEFAULT_IMAGE}') AS image,
       COALESCE(s.image_alt, s.name) AS alt,
       COALESCE(s.description, '') AS description
     FROM services s
     JOIN service_categories sc ON sc.id = s.category_id
     WHERE s.id = $1`,
    [inserted.rows[0].id]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
