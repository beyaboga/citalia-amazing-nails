import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * GET /api/cash-deliveries — historial de entregas (filtros employeeId, from, to,
 * onlyDifferences). Cubre también el reporte de "Diferencias" del spec (se filtra
 * aquí en vez de duplicar una pantalla).
 */
export async function GET(request: Request) {
  const auth = await requirePermission('cash.deliveries.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const onlyDifferences = searchParams.get('onlyDifferences') === 'true';

  const conditions: string[] = [];
  const params: any[] = [];
  const add = (cond: string, value: any) => {
    params.push(value);
    conditions.push(cond.replace('$?', `$${params.length}`));
  };

  if (employeeId) add('cd.employee_id = $?', Number(employeeId));
  if (from) add('cd.delivery_date::date >= $?', from);
  if (to) add('cd.delivery_date::date <= $?', to);
  if (onlyDifferences) conditions.push('ABS(cd.difference) >= 0.01');

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT cd.id, u.name AS "employeeName", rb.name AS "receivedByName",
            to_char(cd.delivery_date, 'YYYY-MM-DD HH24:MI') AS "deliveryDate",
            cd.system_amount::float8 AS "systemAmount",
            cd.received_amount::float8 AS "receivedAmount",
            cd.difference::float8 AS difference
       FROM cash_deliveries cd
       JOIN team_members tm ON tm.id = cd.employee_id
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN users rb ON rb.id = cd.received_by_user_id
       ${where}
       ORDER BY cd.delivery_date DESC`,
    params
  );

  return NextResponse.json(rows);
}

/**
 * POST /api/cash-deliveries — confirma una entrega.
 *
 * Recibe employeeId, paymentIds[] (los seleccionados) y receivedByMethod
 * ({ paymentMethodId: montoRecibido }). Todo se recalcula en el servidor desde
 * payment_details (no se confía en montos del cliente). Marca cada pago como
 * entregado dentro de la misma transacción.
 */
export async function POST(request: Request) {
  const auth = await requirePermission('cash.deliveries.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const employeeId = Number(body?.employeeId);
  const paymentIds: number[] = Array.isArray(body?.paymentIds)
    ? Array.from(new Set((body.paymentIds as any[]).map((n) => Number(n)).filter((n) => Number.isInteger(n))))
    : [];
  const receivedByMethod: Record<string, number> =
    body?.receivedByMethod && typeof body.receivedByMethod === 'object' ? body.receivedByMethod : {};
  const notes = String(body?.notes ?? '').trim();

  if (!Number.isInteger(employeeId)) return NextResponse.json({ error: 'Seleccione una empleada' }, { status: 400 });
  if (paymentIds.length === 0) return NextResponse.json({ error: 'Seleccione al menos una cita' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquear y validar cada pago: PAID, no anulado, no entregado, y de esta empleada.
    const { rows: payments } = await client.query(
      `SELECT p.id, a.id AS "appointmentId"
         FROM payments p
         JOIN appointments a ON a.id = p.appointment_id
         JOIN team_members tm ON tm.user_id = a.technician_id
        WHERE p.id = ANY($1) AND tm.id = $2
          AND p.payment_status = 'PAID' AND p.voided_at IS NULL AND NOT p.is_delivered
        FOR UPDATE OF p`,
      [paymentIds, employeeId]
    );
    if (payments.length !== paymentIds.length) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Uno de los pagos seleccionados ya no está disponible (ya fue entregado, anulado o no es de esta empleada)' },
        { status: 409 }
      );
    }

    // Líneas de payment_details de los pagos incluidos → base del sistema por método.
    const { rows: details } = await client.query(
      `SELECT pd.id, pd.payment_id AS "paymentId", pd.payment_method_id AS "paymentMethodId",
              pd.amount::float8 AS amount, p.appointment_id AS "appointmentId"
         FROM payment_details pd
         JOIN payments p ON p.id = pd.payment_id
        WHERE pd.payment_id = ANY($1)`,
      [paymentIds]
    );

    const systemByMethod = new Map<number, number>();
    for (const d of details) {
      systemByMethod.set(d.paymentMethodId, round2((systemByMethod.get(d.paymentMethodId) ?? 0) + d.amount));
    }

    // Métodos presentes en lo esperado O en lo recibido (por si el admin marca un
    // método que no tenía nada esperado, para que quede la diferencia registrada).
    const allMethodIds = new Set<number>([
      ...systemByMethod.keys(),
      ...Object.keys(receivedByMethod).map(Number).filter((n) => Number.isInteger(n)),
    ]);

    let systemTotal = 0;
    let receivedTotal = 0;
    const methodRows: { methodId: number; system: number; received: number; diff: number }[] = [];
    for (const methodId of allMethodIds) {
      const system = round2(systemByMethod.get(methodId) ?? 0);
      const received = round2(Number(receivedByMethod[methodId]) || 0);
      systemTotal = round2(systemTotal + system);
      receivedTotal = round2(receivedTotal + received);
      methodRows.push({ methodId, system, received, diff: round2(received - system) });
    }

    const difference = round2(receivedTotal - systemTotal);

    const { rows: created } = await client.query(
      `INSERT INTO cash_deliveries (employee_id, received_by_user_id, system_amount, received_amount, difference, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [employeeId, auth.user.id, systemTotal, receivedTotal, difference, notes || null]
    );
    const deliveryId = created[0].id;

    for (const m of methodRows) {
      await client.query(
        `INSERT INTO cash_delivery_method_totals (cash_delivery_id, payment_method_id, system_amount, received_amount, difference)
         VALUES ($1,$2,$3,$4,$5)`,
        [deliveryId, m.methodId, m.system, m.received, m.diff]
      );
    }

    for (const d of details) {
      await client.query(
        `INSERT INTO cash_delivery_details (cash_delivery_id, appointment_id, payment_id, payment_detail_id, payment_method_id, expected_amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [deliveryId, d.appointmentId, d.paymentId, d.id, d.paymentMethodId, d.amount]
      );
    }

    await client.query(
      `UPDATE payments SET is_delivered = true, cash_delivery_id = $1 WHERE id = ANY($2)`,
      [deliveryId, paymentIds]
    );

    await client.query('COMMIT');
    return NextResponse.json({ id: deliveryId, systemAmount: systemTotal, receivedAmount: receivedTotal, difference }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating cash delivery:', error);
    return NextResponse.json({ error: 'No se pudo registrar la entrega' }, { status: 500 });
  } finally {
    client.release();
  }
}
