import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * POST /api/customer-followup/recalculate — botón "Actualizar" de la pantalla de
 * seguimiento. Recalcula todos los clientes con citas calificadas (completadas o
 * pagadas). Los triggers de `022` ya mantienen esto al día hacia adelante; este
 * botón sirve para reflejar de inmediato historial que quedó desalineado (p. ej.
 * registrado antes de instalar el módulo, o corregido fuera del flujo normal).
 */
export async function POST() {
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { rows } = await pool.query('SELECT recompute_all_customer_category_stats() AS count');
  return NextResponse.json({ customersProcessed: rows[0].count });
}
