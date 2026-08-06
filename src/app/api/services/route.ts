import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

const DEFAULT_IMAGE = '/assets/images/no_image.png';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      s.id::text AS id,
      s.name,
      sc.name AS category,
      s.price::float8 AS price,
      s.cost::float8 AS cost,
      s.duration_minutes AS duration,
      s.is_active AS "isActive",
      COALESCE(s.image_url, '${DEFAULT_IMAGE}') AS image,
      COALESCE(s.image_alt, s.name) AS alt,
      COALESCE(s.description, '') AS description
    FROM services s
    JOIN service_categories sc ON sc.id = s.category_id
    ORDER BY s.created_at DESC
  `);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('services.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();

  const name = String(body?.name ?? '').trim();
  const description = String(body?.description ?? '').trim();
  const categoryId = Number(body?.categoryId);
  const price = Number(body?.price);
  const cost =
    body?.cost !== undefined && body?.cost !== null && body?.cost !== '' ? Number(body.cost) : 0;
  const durationMinutes = Number(body?.durationMinutes);
  const isActive = Boolean(body?.isActive);
  const specialRequirements = body?.specialRequirements
    ? String(body.specialRequirements).trim()
    : null;
  const imageUrl = body?.imageUrl ? String(body.imageUrl) : null;

  if (!name || name.length < 3) {
    return NextResponse.json(
      { error: 'El nombre del servicio es obligatorio (mínimo 3 caracteres)' },
      { status: 400 }
    );
  }
  if (!description || description.length < 10) {
    return NextResponse.json(
      { error: 'La descripción es obligatoria (mínimo 10 caracteres)' },
      { status: 400 }
    );
  }
  if (!categoryId) {
    return NextResponse.json({ error: 'Debe seleccionar una categoría' }, { status: 400 });
  }
  if (!price || price <= 0) {
    return NextResponse.json({ error: 'El precio debe ser mayor a 0' }, { status: 400 });
  }
  if (!Number.isFinite(cost) || cost < 0) {
    return NextResponse.json({ error: 'El costo no puede ser negativo' }, { status: 400 });
  }
  if (!durationMinutes || durationMinutes <= 0 || durationMinutes > 720) {
    return NextResponse.json(
      { error: 'La duración debe estar entre 1 minuto y 12 horas' },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO services (category_id, name, description, price, cost, duration_minutes, is_active, special_requirements, image_url, image_alt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING
         id, category_id AS "categoryId", name, description, price, cost,
         duration_minutes AS "durationMinutes", is_active AS "isActive",
         special_requirements AS "specialRequirements",
         image_url AS image, image_alt AS "imageAlt"`,
      [
        categoryId,
        name,
        description,
        price,
        cost,
        durationMinutes,
        isActive,
        specialRequirements,
        imageUrl,
        imageUrl ? name : null,
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json({ error: 'La categoría seleccionada no existe' }, { status: 400 });
    }
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 });
  }
}
