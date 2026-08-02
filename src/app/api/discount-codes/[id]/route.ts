import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

async function requireManager() {
  const user = await getSession();
  if (!user) return { error: 'No autenticado', status: 401 as const };
  if (!hasPermission(user, 'promotions.manage')) {
    return { error: 'No tiene permiso para gestionar descuentos', status: 403 as const };
  }
  return { user };
}

/** GET /api/discount-codes/[id] — detalle para editar, con sus restricciones. */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const discountId = Number(id);
  if (!Number.isInteger(discountId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT
       dc.id, dc.name, dc.code, dc.description,
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
       COALESCE((SELECT array_agg(service_id) FROM discount_code_services WHERE discount_code_id = dc.id), '{}') AS "serviceIds",
       COALESCE((SELECT array_agg(category_id) FROM discount_code_categories WHERE discount_code_id = dc.id), '{}') AS "categoryIds",
       COALESCE((SELECT array_agg(customer_id) FROM discount_code_customers WHERE discount_code_id = dc.id), '{}') AS "customerIds"
     FROM discount_codes dc
     WHERE dc.id = $1`,
    [discountId]
  );

  if (rows.length === 0) return NextResponse.json({ error: 'Descuento no encontrado' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

/** PATCH /api/discount-codes/[id] — editar. Reemplaza las restricciones enviadas. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const discountId = Number(id);
  if (!Number.isInteger(discountId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const code = String(body?.code ?? '').trim().toUpperCase();
  const discountType = body?.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Number(body?.discountValue);

  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
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

    const { rowCount } = await client.query(
      `UPDATE discount_codes SET
         name = $2, code = $3, description = $4, discount_type = $5, discount_value = $6,
         minimum_purchase = $7, start_date = $8, end_date = $9, max_uses = $10, is_active = $11,
         applies_to_all_services = $12, applies_to_all_customers = $13, updated_by = $14
       WHERE id = $1`,
      [
        discountId,
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
        auth.user.id,
      ]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Descuento no encontrado' }, { status: 404 });
    }

    // Reemplazo completo de restricciones.
    await client.query('DELETE FROM discount_code_services WHERE discount_code_id = $1', [discountId]);
    await client.query('DELETE FROM discount_code_categories WHERE discount_code_id = $1', [discountId]);
    await client.query('DELETE FROM discount_code_customers WHERE discount_code_id = $1', [discountId]);

    for (const serviceId of serviceIds) {
      await client.query('INSERT INTO discount_code_services (discount_code_id, service_id) VALUES ($1, $2)', [discountId, serviceId]);
    }
    for (const categoryId of categoryIds) {
      await client.query('INSERT INTO discount_code_categories (discount_code_id, category_id) VALUES ($1, $2)', [discountId, categoryId]);
    }
    for (const customerId of customerIds) {
      await client.query('INSERT INTO discount_code_customers (discount_code_id, customer_id) VALUES ($1, $2)', [discountId, customerId]);
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un código con ese nombre' }, { status: 409 });
    }
    console.error('Error updating discount code:', error);
    return NextResponse.json({ error: 'Error al actualizar el descuento' }, { status: 500 });
  } finally {
    client.release();
  }
}

/** DELETE /api/discount-codes/[id] — eliminar un código. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const discountId = Number(id);
  if (!Number.isInteger(discountId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rowCount } = await pool.query('DELETE FROM discount_codes WHERE id = $1', [discountId]);
  if (rowCount === 0) return NextResponse.json({ error: 'Descuento no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
