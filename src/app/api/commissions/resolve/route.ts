import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/commissions/resolve?technicianId=N
 *
 * Devuelve, para el esquema de comisión activo del técnico, cuánto genera cada
 * servicio: { [serviceId]: { amount, label } }. Solo lectura, sin efectos.
 *
 * La comisión es información financiera: se entrega únicamente a quien tenga el
 * permiso `reports.view`. Sin permiso o sin esquema asignado, devuelve {} y la
 * pantalla simplemente no muestra comisiones.
 *
 * Orden de resolución (igual que el diseño): regla del servicio → regla de la
 * categoría → regla por defecto del esquema.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!hasPermission(user, 'reports.view')) {
    return NextResponse.json({});
  }

  const { searchParams } = new URL(request.url);
  const technicianId = Number(searchParams.get('technicianId'));
  if (!Number.isInteger(technicianId)) return NextResponse.json({});

  const { rows: schemeRows } = await pool.query(
    `SELECT tm.commission_scheme_id AS "schemeId"
     FROM team_members tm
     WHERE tm.user_id = $1 AND tm.commission_scheme_id IS NOT NULL`,
    [technicianId]
  );
  if (schemeRows.length === 0) return NextResponse.json({});

  const schemeId = schemeRows[0].schemeId;

  const [{ rows: services }, { rows: rules }] = await Promise.all([
    pool.query('SELECT id, category_id AS "categoryId", price::float8 AS price FROM services'),
    pool.query(
      `SELECT r.service_id AS "serviceId", r.category_id AS "categoryId",
              r.value::float8 AS value, t.code AS "typeCode"
       FROM commission_rules r
       JOIN commission_types t ON t.id = r.commission_type_id
       WHERE r.scheme_id = $1`,
      [schemeId]
    ),
  ]);

  const byService = new Map<number, { value: number; typeCode: string }>();
  const byCategory = new Map<number, { value: number; typeCode: string }>();
  let defaultRule: { value: number; typeCode: string } | null = null;

  for (const rule of rules) {
    if (rule.serviceId) byService.set(rule.serviceId, rule);
    else if (rule.categoryId) byCategory.set(rule.categoryId, rule);
    else defaultRule = rule;
  }

  const result: Record<string, { amount: number; label: string }> = {};

  for (const service of services) {
    const rule = byService.get(service.id) ?? byCategory.get(service.categoryId) ?? defaultRule;
    if (!rule) continue;

    const amount =
      rule.typeCode === 'percentage' ? (service.price * rule.value) / 100 : rule.value;
    const label =
      rule.typeCode === 'percentage' ? `${rule.value}%` : `L ${rule.value.toLocaleString()}`;

    result[String(service.id)] = { amount: Math.round(amount * 100) / 100, label };
  }

  return NextResponse.json(result);
}
