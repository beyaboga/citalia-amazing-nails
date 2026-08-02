import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/[id]/history
 *
 * Auditoría de la cita: cambios de precio por servicio y descuentos aplicados,
 * con quién, cuándo y por qué. Solo para quien puede modificar precios — es
 * información sensible del negocio, no operativa.
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'pricing.modify')) {
    return NextResponse.json({ error: 'No tiene permiso para ver el historial' }, { status: 403 });
  }

  const { id } = await context.params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const [{ rows: priceChanges }, { rows: discounts }] = await Promise.all([
    pool.query(
      `SELECT
         h.id,
         COALESCE(s.name, 'Servicio eliminado') AS "serviceName",
         h.original_price::float8 AS "originalPrice",
         h.new_price::float8 AS "newPrice",
         h.reason,
         COALESCE(u.name, 'Usuario eliminado') AS "modifiedBy",
         to_char(h.modified_at, 'DD/MM/YYYY HH24:MI') AS "modifiedAt"
       FROM appointment_price_history h
       LEFT JOIN services s ON s.id = h.service_id
       LEFT JOIN users u ON u.id = h.modified_by
       WHERE h.appointment_id = $1
       ORDER BY h.modified_at DESC, h.id DESC`,
      [appointmentId]
    ),
    pool.query(
      `SELECT
         d.id,
         d.discount_type AS "discountType",
         d.discount_code AS "discountCode",
         d.discount_name AS "discountName",
         d.reason,
         d.discount_amount::float8 AS "discountAmount",
         d.original_total::float8 AS "originalTotal",
         d.final_total::float8 AS "finalTotal",
         COALESCE(u.name, 'Usuario eliminado') AS "appliedBy",
         to_char(d.applied_at, 'DD/MM/YYYY HH24:MI') AS "appliedAt"
       FROM appointment_discounts d
       LEFT JOIN users u ON u.id = d.applied_by
       WHERE d.appointment_id = $1
       ORDER BY d.id`,
      [appointmentId]
    ),
  ]);

  return NextResponse.json({ priceChanges, discounts });
}
