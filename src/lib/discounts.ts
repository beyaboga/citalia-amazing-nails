import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

export interface ResolvedDiscount {
  discountCodeId: number;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  totalAfter: number;
}

export type DiscountResult =
  | { ok: true; discount: ResolvedDiscount }
  | { ok: false; reason: string };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Valida un código de descuento contra una cita concreta y calcula el monto.
 *
 * Es la única fuente de verdad de las reglas: la usan tanto la vista previa (al
 * escribir el código en el cobro) como el guardado de la cita, para que nunca haya
 * discrepancia entre lo que se muestra y lo que se guarda.
 *
 * `subtotal` lo calcula el llamador desde los precios reales de los servicios.
 */
export async function resolveDiscount(
  db: Db,
  input: { code: string; customerId: number | null; serviceIds: number[]; subtotal: number }
): Promise<DiscountResult> {
  const code = String(input.code ?? '').trim();
  if (!code) return { ok: false, reason: 'Ingrese un código' };

  const { rows } = await db.query(
    `SELECT *,
       (start_date IS NOT NULL AND start_date > CURRENT_DATE) AS "notStarted",
       (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS expired,
       (max_uses IS NOT NULL AND current_uses >= max_uses) AS "usesExhausted"
     FROM discount_codes
     WHERE upper(code) = upper($1)`,
    [code]
  );

  if (rows.length === 0) return { ok: false, reason: 'Código inexistente' };
  const dc = rows[0];

  if (!dc.is_active) return { ok: false, reason: 'Código inactivo' };
  if (dc.notStarted) return { ok: false, reason: 'El código aún no está vigente' };
  if (dc.expired) return { ok: false, reason: 'Código vencido' };
  if (dc.usesExhausted) return { ok: false, reason: 'Límite de usos alcanzado' };

  if (dc.minimum_purchase !== null && input.subtotal < Number(dc.minimum_purchase)) {
    return {
      ok: false,
      reason: `El monto mínimo para este código es L ${Number(dc.minimum_purchase).toLocaleString()}`,
    };
  }

  // Restricción por cliente
  if (!dc.applies_to_all_customers) {
    if (!input.customerId) {
      return { ok: false, reason: 'Este código aplica solo a clientes específicos' };
    }
    const { rows: match } = await db.query(
      'SELECT 1 FROM discount_code_customers WHERE discount_code_id = $1 AND customer_id = $2',
      [dc.id, input.customerId]
    );
    if (match.length === 0) {
      return { ok: false, reason: 'Este código no aplica para el cliente seleccionado' };
    }
  }

  // Restricción por servicios / categorías: basta con que un servicio de la cita
  // esté en la lista de servicios permitidos o pertenezca a una categoría permitida.
  if (!dc.applies_to_all_services) {
    const [{ rows: svcRows }, { rows: catRows }, { rows: apptServices }] = await Promise.all([
      db.query('SELECT service_id FROM discount_code_services WHERE discount_code_id = $1', [dc.id]),
      db.query('SELECT category_id FROM discount_code_categories WHERE discount_code_id = $1', [dc.id]),
      db.query('SELECT id, category_id AS "categoryId" FROM services WHERE id = ANY($1)', [input.serviceIds]),
    ]);
    const allowedServices = new Set(svcRows.map((r) => r.service_id));
    const allowedCategories = new Set(catRows.map((r) => r.category_id));
    const anyMatch = apptServices.some(
      (s) => allowedServices.has(s.id) || allowedCategories.has(s.categoryId)
    );
    if (!anyMatch) return { ok: false, reason: 'No aplica para estos servicios' };
  }

  // Cálculo del monto (nunca mayor que el subtotal → el total no puede ser negativo).
  const value = Number(dc.discount_value);
  const rawAmount = dc.discount_type === 'percentage' ? (input.subtotal * value) / 100 : value;
  const discountAmount = round2(Math.min(rawAmount, input.subtotal));

  return {
    ok: true,
    discount: {
      discountCodeId: dc.id,
      code: dc.code,
      name: dc.name,
      discountType: dc.discount_type,
      discountValue: value,
      discountAmount,
      subtotal: round2(input.subtotal),
      totalAfter: round2(input.subtotal - discountAmount),
    },
  };
}
