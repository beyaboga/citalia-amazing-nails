import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/** GET /api/discount-codes — lista para la pantalla de administración. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'promotions.manage')) {
    return NextResponse.json({ error: 'No tiene permiso para gestionar descuentos' }, { status: 403 });
  }

  const { rows } = await pool.query(`
    SELECT
      dc.id,
      dc.name,
      dc.code,
      dc.description,
      dc.discount_type AS "discountType",
      dc.discount_value::float8 AS "discountValue",
      dc.minimum_purchase::float8 AS "minimumPurchase",
      to_char(dc.start_date, 'YYYY-MM-DD') AS "startDate",
      to_char(dc.end_date, 'YYYY-MM-DD') AS "endDate",
      dc.max_uses AS "maxUses",
      dc.current_uses AS "currentUses",
      dc.is_active AS "isActive",
      dc.applies_to_all_services AS "appliesToAllServices",
      dc.applies_to_all_customers AS "appliesToAllCustomers",
      (dc.end_date IS NOT NULL AND dc.end_date < CURRENT_DATE) AS expired
    FROM discount_codes dc
    ORDER BY dc.created_at DESC
  `);

  return NextResponse.json(rows);
}

/** POST /api/discount-codes — crear un código nuevo. */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'promotions.manage')) {
    return NextResponse.json({ error: 'No tiene permiso para crear descuentos' }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const code = String(body?.code ?? '').trim().toUpperCase();
  const discountType = body?.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Number(body?.discountValue);

  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json(
      { error: 'El código solo puede tener letras, números, guiones y guion bajo' },
      { status: 400 }
    );
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: 'El valor del descuento debe ser mayor a 0' }, { status: 400 });
  }
  if (discountType === 'percentage' && discountValue > 100) {
    return NextResponse.json({ error: 'Un porcentaje no puede ser mayor a 100' }, { status: 400 });
  }

  const serviceIds: number[] = Array.isArray(body?.serviceIds) ? body.serviceIds.map(Number).filter(Number.isInteger) : [];
  const categoryIds: number[] = Array.isArray(body?.categoryIds) ? body.categoryIds.map(Number).filter(Number.isInteger) : [];
  const customerIds: number[] = Array.isArray(body?.customerIds) ? body.customerIds.map(Number).filter(Number.isInteger) : [];
  const appliesToAllServices = serviceIds.length === 0 && categoryIds.length === 0;
  const appliesToAllCustomers = customerIds.length === 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO discount_codes (
         name, code, description, discount_type, discount_value, minimum_purchase,
         start_date, end_date, max_uses, is_active,
         applies_to_all_services, applies_to_all_customers, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
       RETURNING id`,
      [
        name,
        code,
        body?.description ? String(body.description).trim() : null,
        discountType,
        discountValue,
        body?.minimumPurchase ? Number(body.minimumPurchase) : null,
        body?.startDate || null,
        body?.endDate || null,
        body?.maxUses ? Number(body.maxUses) : null,
        body?.isActive === undefined ? true : Boolean(body.isActive),
        appliesToAllServices,
        appliesToAllCustomers,
        user.id,
      ]
    );

    const discountId = rows[0].id;

    for (const serviceId of serviceIds) {
      await client.query(
        'INSERT INTO discount_code_services (discount_code_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [discountId, serviceId]
      );
    }
    for (const categoryId of categoryIds) {
      await client.query(
        'INSERT INTO discount_code_categories (discount_code_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [discountId, categoryId]
      );
    }
    for (const customerId of customerIds) {
      await client.query(
        'INSERT INTO discount_code_customers (discount_code_id, customer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [discountId, customerId]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ id: discountId }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un código con ese nombre' }, { status: 409 });
    }
    console.error('Error creating discount code:', error);
    return NextResponse.json({ error: 'Error al guardar el descuento' }, { status: 500 });
  } finally {
    client.release();
  }
}
