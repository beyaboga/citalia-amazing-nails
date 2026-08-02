import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { computeTipAmount, formatReceiptNumber, type TipType } from '@/lib/payments';
import { loadAppointmentBilling } from '@/lib/combinedCheckout';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/payments/combined — cobra VARIAS citas del mismo cliente en un solo pago
 * y un solo recibo, conservando la comisión de cada técnica.
 *
 * Crea un `payment_groups` (con el número de recibo) y un `payments` por cita (cada
 * uno dispara el trigger de comisiones de su técnica). La propina se registra una vez
 * sobre la cita primaria. El cobro individual (/api/payments) no se ve afectado.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para cobrar citas' }, { status: 403 });
  }

  const body = await request.json();
  const appointmentIds: number[] = Array.isArray(body?.appointmentIds)
    ? Array.from(new Set((body.appointmentIds as any[]).map((n) => Number(n)).filter((n) => Number.isInteger(n)) as number[]))
    : [];
  if (appointmentIds.length < 2) {
    return NextResponse.json({ error: 'Seleccione al menos dos citas para cobrar juntas' }, { status: 400 });
  }

  // Cobro combinado v1: un solo método de pago para el total.
  const details = Array.isArray(body?.details)
    ? body.details
        .map((d: any) => ({ paymentMethodId: Number(d?.paymentMethodId), reference: String(d?.reference ?? '').trim() || undefined }))
        .filter((d: any) => Number.isInteger(d.paymentMethodId))
    : [];
  if (details.length !== 1) {
    return NextResponse.json({ error: 'El cobro combinado admite un solo método de pago' }, { status: 400 });
  }
  const method = details[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cargar y validar cada cita (bloqueando su fila) — mismo cliente, sin pago vigente.
    const billings = [];
    let customerId: number | null = null;
    for (const id of appointmentIds) {
      const { rows: lockRows } = await client.query(
        `SELECT customer_id AS "customerId", status FROM appointments WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (lockRows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `Cita ${id} no encontrada` }, { status: 404 });
      }
      if (customerId === null) customerId = lockRows[0].customerId;
      else if (customerId !== lockRows[0].customerId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Todas las citas deben ser del mismo cliente' }, { status: 400 });
      }

      const { rows: existing } = await client.query(
        `SELECT 1 FROM payments WHERE appointment_id = $1 AND voided_at IS NULL`,
        [id]
      );
      if (existing.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `La cita ${id} ya tiene un pago registrado` }, { status: 409 });
      }

      const billing = await loadAppointmentBilling(client, id);
      if (!billing || billing.subtotal <= 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `La cita ${id} no tiene servicios que cobrar` }, { status: 400 });
      }
      billings.push(billing);
    }

    // Método válido y activo.
    const { rows: mrows } = await client.query(
      `SELECT id FROM payment_methods WHERE id = $1 AND is_active AND type <> 'SPLIT_PAYMENT'`,
      [method.paymentMethodId]
    );
    if (mrows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'El método de pago no es válido' }, { status: 400 });
    }

    const groupSubtotal = round2(billings.reduce((s, b) => s + b.subtotal, 0));
    const groupDiscount = round2(billings.reduce((s, b) => s + b.discountAmount, 0));
    const groupAfterDiscount = round2(billings.reduce((s, b) => s + b.afterDiscount, 0));

    // Propina (una sola, sobre el total del grupo), separada del ingreso del servicio.
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
      tipAmount = computeTipAmount(mode, value, groupAfterDiscount);
      tipPercentage = mode === 'PERCENTAGE' ? value : null;
    }

    const groupTotal = round2(groupAfterDiscount + tipAmount);

    // Número de recibo (el UPDATE serializa frente a cobros simultáneos).
    const { rows: numRows } = await client.query(
      `UPDATE receipt_numbering SET next_sequence = next_sequence + 1
        WHERE id = 1 RETURNING prefix, next_sequence - 1 AS sequence, padding`
    );
    const { prefix, sequence, padding } = numRows[0];
    const receiptNumber = formatReceiptNumber(prefix, sequence, padding);

    const { rows: groupRows } = await client.query(
      `INSERT INTO payment_groups
         (customer_id, prefix, sequence_number, receipt_number, subtotal, discount_amount, tip_amount, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [customerId, prefix, sequence, receiptNumber, groupSubtotal, groupDiscount, tipAmount, groupTotal, user.id]
    );
    const groupId = groupRows[0].id;

    // Un pago por cita (dispara el trigger de comisiones de cada técnica). La propina
    // se adjunta a la cita primaria (la primera).
    for (let i = 0; i < billings.length; i++) {
      const b = billings[i];
      const isPrimary = i === 0;
      const rowTip = isPrimary ? tipAmount : 0;
      const rowTotal = round2(b.afterDiscount + rowTip);

      const { rows: payRows } = await client.query(
        `INSERT INTO payments
           (appointment_id, customer_id, subtotal, discount_amount, tip_amount, total_amount, paid_amount, payment_status, created_by, payment_group_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'PAID',$8,$9) RETURNING id`,
        [b.appointmentId, customerId, b.subtotal, b.discountAmount, rowTip, rowTotal, rowTotal, user.id, groupId]
      );
      const paymentId = payRows[0].id;

      await client.query(
        `INSERT INTO payment_details (payment_id, payment_method_id, amount, reference) VALUES ($1,$2,$3,$4)`,
        [paymentId, method.paymentMethodId, rowTotal, method.reference ?? null]
      );

      if (isPrimary && tipType && tipAmount > 0) {
        await client.query(
          `INSERT INTO appointment_tips
             (appointment_id, payment_id, tip_type, percentage, amount, received_by, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [b.appointmentId, paymentId, tipType, tipPercentage, tipAmount, tipReceivedBy, user.id]
        );
      }

      await client.query(
        `UPDATE appointments SET status = 'completed'
          WHERE id = $1 AND status IN ('pending', 'confirmed', 'in_progress')`,
        [b.appointmentId]
      );
    }

    await client.query('COMMIT');

    // Recibo: todas las líneas agrupadas por técnica.
    const serviceLines = billings.flatMap((b) =>
      b.serviceLines.map((l) => ({ ...l, technicianName: b.technicianName }))
    );

    return NextResponse.json(
      {
        groupId,
        receiptNumber,
        customerName: billings[0].customerName,
        date: billings[0].date,
        serviceLines,
        subtotal: groupSubtotal,
        discountAmount: groupDiscount,
        tipAmount,
        totalAmount: groupTotal,
        paidAmount: groupTotal,
        pendingAmount: 0,
        paymentStatus: 'PAID',
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in combined payment:', error);
    return NextResponse.json({ error: 'No se pudo registrar el cobro combinado' }, { status: 500 });
  } finally {
    client.release();
  }
}
