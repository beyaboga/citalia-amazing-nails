import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { computeTipAmount, formatReceiptNumber, type TipType } from '@/lib/payments';
import { autoAssignTip } from '@/lib/tips';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface DetailInput {
  paymentMethodId: number;
  amount: number;
  reference?: string;
}

/**
 * POST /api/payments — cobra una cita en una sola transacción.
 *
 * Hace todo atómicamente: registra el pago y su desglose, la propina (separada del
 * ingreso del servicio), genera el recibo con numeración automática y, si el pago
 * queda completo, marca la cita como completada. Los montos del servicio y del
 * descuento se calculan en el SERVIDOR desde lo ya guardado en la cita: el navegador
 * no puede inventar un subtotal ni un descuento.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para cobrar citas' }, { status: 403 });
  }

  const body = await request.json();
  const appointmentId = Number(body?.appointmentId);
  if (!Number.isInteger(appointmentId)) {
    return NextResponse.json({ error: 'Cita no válida' }, { status: 400 });
  }

  const details: DetailInput[] = Array.isArray(body?.details)
    ? body.details
        .map((d: any) => ({
          paymentMethodId: Number(d?.paymentMethodId),
          amount: round2(Number(d?.amount)),
          reference: String(d?.reference ?? '').trim() || undefined,
        }))
        .filter((d: DetailInput) => Number.isInteger(d.paymentMethodId) && d.amount > 0)
    : [];

  if (details.length === 0) {
    return NextResponse.json({ error: 'Debe registrar al menos un pago' }, { status: 400 });
  }

  const isSplit = Boolean(body?.split);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Cita y su estado ---
    const { rows: apptRows } = await client.query(
      `SELECT customer_id AS "customerId", status FROM appointments WHERE id = $1 FOR UPDATE`,
      [appointmentId]
    );
    if (apptRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    const customerId = apptRows[0].customerId;

    // --- Subtotal (precios aplicados) y descuentos, autoritativos desde la base ---
    const { rows: subtotalRows } = await client.query(
      'SELECT COALESCE(SUM(price_at_booking), 0)::float8 AS subtotal FROM appointment_services WHERE appointment_id = $1',
      [appointmentId]
    );
    const subtotal = round2(subtotalRows[0].subtotal);
    if (subtotal <= 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'La cita no tiene servicios que cobrar' }, { status: 400 });
    }

    const { rows: discountRows } = await client.query(
      `SELECT COALESCE(SUM(discount_amount), 0)::float8 AS total
       FROM appointment_discounts WHERE appointment_id = $1`,
      [appointmentId]
    );
    const discountAmount = round2(discountRows[0].total);
    const afterDiscount = round2(subtotal - discountAmount);

    // --- Propina (opcional, sobre el total ya descontado) ---
    let tipAmount = 0;
    let tipType: TipType | null = null;
    let tipPercentage: number | null = null;
    let tipReceivedBy: 'CASHIER' | 'EMPLOYEE' = 'CASHIER';

    if (body?.tip && body.tip.mode && body.tip.mode !== 'none') {
      const mode = body.tip.mode === 'percentage' ? 'PERCENTAGE' : 'FIXED';
      const value = Number(body.tip.value);
      if (!Number.isFinite(value) || value < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'La propina no es válida' }, { status: 400 });
      }
      tipType = mode;
      tipReceivedBy = body.tip.receivedBy === 'EMPLOYEE' ? 'EMPLOYEE' : 'CASHIER';
      tipAmount = computeTipAmount(mode, value, afterDiscount);
      tipPercentage = mode === 'PERCENTAGE' ? value : null;
    }

    const totalAmount = round2(afterDiscount + tipAmount);

    // --- Validación de los montos pagados ---
    const paidAmount = round2(details.reduce((sum, d) => sum + d.amount, 0));
    if (paidAmount > totalAmount + 0.001) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `El monto pagado (L ${paidAmount}) supera el total (L ${totalAmount})` },
        { status: 400 }
      );
    }
    // Solo el pago dividido admite quedar incompleto; un método único paga el total.
    if (!isSplit && Math.abs(paidAmount - totalAmount) > 0.01) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'El pago debe cubrir el total. Use "Dividir pago" para montos parciales.' },
        { status: 400 }
      );
    }

    // Los métodos existen y están activos.
    const methodIds = [...new Set(details.map((d) => d.paymentMethodId))];
    const { rows: methodRows } = await client.query(
      'SELECT id, is_active AS "isActive", type FROM payment_methods WHERE id = ANY($1)',
      [methodIds]
    );
    const methodMap = new Map(methodRows.map((m) => [m.id, m]));
    for (const d of details) {
      const method = methodMap.get(d.paymentMethodId);
      if (!method || !method.isActive || method.type === 'SPLIT_PAYMENT') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Uno de los métodos de pago no es válido' }, { status: 400 });
      }
    }

    const paymentStatus = paidAmount >= totalAmount - 0.01 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

    // --- Cabecera del pago ---
    let paymentId: number;
    try {
      const { rows } = await client.query(
        `INSERT INTO payments
           (appointment_id, customer_id, subtotal, discount_amount, tip_amount,
            total_amount, paid_amount, payment_status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [appointmentId, customerId, subtotal, discountAmount, tipAmount, totalAmount, paidAmount, paymentStatus, user.id]
      );
      paymentId = rows[0].id;
    } catch (error: any) {
      // Índice único: la cita ya tiene un pago vigente.
      if (error?.code === '23505') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Esta cita ya tiene un pago registrado' },
          { status: 409 }
        );
      }
      throw error;
    }

    // --- Desglose por método ---
    for (const d of details) {
      await client.query(
        `INSERT INTO payment_details (payment_id, payment_method_id, amount, reference)
         VALUES ($1,$2,$3,$4)`,
        [paymentId, d.paymentMethodId, d.amount, d.reference ?? null]
      );
    }

    // --- Propina (separada del ingreso del servicio) ---
    if (tipType && tipAmount > 0) {
      const { rows: tipRows } = await client.query(
        `INSERT INTO appointment_tips
           (appointment_id, payment_id, tip_type, percentage, amount, received_by, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [appointmentId, paymentId, tipType, tipPercentage, tipAmount, tipReceivedBy, user.id]
      );
      // Cita de una sola técnica: la propina se asigna sola a esa técnica.
      await autoAssignTip(client, tipRows[0].id, appointmentId, user.id);
    }

    // --- Recibo con numeración automática (el UPDATE serializa a los pagos simultáneos) ---
    const { rows: numRows } = await client.query(
      `UPDATE receipt_numbering
          SET next_sequence = next_sequence + 1
        WHERE id = 1
      RETURNING prefix, next_sequence - 1 AS sequence, padding`
    );
    const { prefix, sequence, padding } = numRows[0];
    const receiptNumber = formatReceiptNumber(prefix, sequence, padding);

    await client.query(
      `INSERT INTO receipts (payment_id, receipt_number, prefix, sequence_number, generated_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [paymentId, receiptNumber, prefix, sequence, user.id]
    );

    // --- Cita completada solo si el pago quedó completo ---
    if (paymentStatus === 'PAID') {
      await client.query(
        `UPDATE appointments SET status = 'completed'
          WHERE id = $1 AND status IN ('pending', 'confirmed', 'in_progress')`,
        [appointmentId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json(
      {
        paymentId,
        receiptNumber,
        subtotal,
        discountAmount,
        tipAmount,
        totalAmount,
        paidAmount,
        pendingAmount: round2(totalAmount - paidAmount),
        paymentStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
