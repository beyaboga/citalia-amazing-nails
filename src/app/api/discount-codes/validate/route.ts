import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { resolveDiscount } from '@/lib/discounts';

/**
 * POST /api/discount-codes/validate — vista previa del descuento en el cobro.
 *
 * Recibe { code, customerId, serviceIds, servicePrices }. Calcula el subtotal en el
 * servidor (con precios personalizados solo si el usuario puede modificarlos) y valida
 * el código. El guardado de la cita vuelve a validar, así que esto es solo la vista
 * previa; la verdad la impone el backend al guardar.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'discounts.apply')) {
    return NextResponse.json({ error: 'No tiene permiso para aplicar descuentos' }, { status: 403 });
  }

  const body = await request.json();
  const code = String(body?.code ?? '').trim();
  const customerId = body?.customerId ? Number(body.customerId) : null;
  const serviceIds: number[] = Array.isArray(body?.serviceIds)
    ? body.serviceIds.map(Number).filter(Number.isInteger)
    : [];

  if (serviceIds.length === 0) {
    return NextResponse.json({ valid: false, reason: 'Seleccione servicios antes de aplicar un código' });
  }

  const canModifyPricing = hasPermission(user, 'pricing.modify');
  const overrides: Record<number, number> =
    canModifyPricing && body?.servicePrices && typeof body.servicePrices === 'object'
      ? Object.fromEntries(
          Object.entries(body.servicePrices)
            .map(([id, price]) => [Number(id), Number(price)])
            .filter(([id, price]) => Number.isInteger(id) && Number.isFinite(price) && price >= 0)
        )
      : {};

  const { rows: services } = await pool.query(
    'SELECT id, price::float8 AS price FROM services WHERE id = ANY($1)',
    [serviceIds]
  );
  const subtotal = services.reduce((sum, s) => sum + (overrides[s.id] ?? s.price), 0);

  const result = await resolveDiscount(pool, { code, customerId, serviceIds, subtotal });

  if (!result.ok) {
    return NextResponse.json({ valid: false, reason: result.reason });
  }
  return NextResponse.json({ valid: true, ...result.discount });
}
