import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/[id]/payment — pago vigente de la cita (o null).
 *
 * Sirve para dos cosas en la pantalla de cobro: saber si la cita ya está pagada
 * (para no cobrarla dos veces) y reconstruir el recibo. Solo el pago no anulado.
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'payments.charge')) {
    return NextResponse.json({ error: 'No tiene permiso para ver pagos' }, { status: 403 });
  }

  const { id } = await context.params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.payment_group_id AS "paymentGroupId",
       p.subtotal::float8 AS subtotal,
       p.discount_amount::float8 AS "discountAmount",
       p.tip_amount::float8 AS "tipAmount",
       p.total_amount::float8 AS "totalAmount",
       p.paid_amount::float8 AS "paidAmount",
       p.payment_status AS "paymentStatus",
       to_char(p.created_at, 'DD/MM/YYYY HH24:MI') AS "createdAt",
       cashier.name AS "cashierName",
       r.receipt_number AS "receiptNumber"
     FROM payments p
     LEFT JOIN users cashier ON cashier.id = p.created_by
     LEFT JOIN receipts r ON r.payment_id = p.id
     WHERE p.appointment_id = $1 AND p.voided_at IS NULL`,
    [appointmentId]
  );

  if (rows.length === 0) return NextResponse.json(null);

  const payment = rows[0];

  // Comisión generada por esta cita: solo para quien puede ver/pagar comisiones,
  // no para quien solo cobra citas (ej. recepción).
  const canSeeCommission = hasPermission(user, 'commissions.pay') || hasPermission(user, 'payroll.configure');
  const commissionQuery = `
    SELECT ce.id, ce.commission_amount::float8 AS amount, ce.status,
           COALESCE(s.name, 'Comisión escalonada (monto total de la cita)') AS "serviceName",
           cs.calculation_mode AS "calculationMode", cs.name AS "schemeName",
           u.name AS "employeeName"
      FROM commission_entries ce
      LEFT JOIN appointment_services aps ON aps.id = ce.appointment_service_id
      LEFT JOIN services s ON s.id = ce.service_id
      JOIN commission_schemes cs ON cs.id = ce.commission_scheme_id
      JOIN team_members tm ON tm.id = ce.team_member_id
      JOIN users u ON u.id = tm.user_id
     WHERE %CONDITION%
     ORDER BY ce.id`;

  // Cobro combinado: el recibo abarca todas las citas del grupo (todos los servicios,
  // agrupados por técnica) y los totales del grupo.
  if (payment.paymentGroupId) {
    const { rows: groupRows } = await pool.query(
      `SELECT receipt_number AS "receiptNumber", subtotal::float8 AS subtotal,
              discount_amount::float8 AS "discountAmount", tip_amount::float8 AS "tipAmount",
              total_amount::float8 AS "totalAmount"
         FROM payment_groups WHERE id = $1`,
      [payment.paymentGroupId]
    );
    const g = groupRows[0];

    const { rows: lineRows } = await pool.query(
      `SELECT s.id AS "serviceId", s.name, aps.price_at_booking::float8 AS price, u.name AS "technicianName"
         FROM payments p
         JOIN appointments a ON a.id = p.appointment_id
         LEFT JOIN users u ON u.id = a.technician_id
         JOIN appointment_services aps ON aps.appointment_id = a.id
         JOIN services s ON s.id = aps.service_id
        WHERE p.payment_group_id = $1
        ORDER BY u.name, s.name`,
      [payment.paymentGroupId]
    );

    const { rows: methodRows } = await pool.query(
      `SELECT pm.name AS "methodName", SUM(pd.amount)::float8 AS amount, MIN(pd.reference) AS reference
         FROM payment_details pd
         JOIN payments p ON p.id = pd.payment_id
         JOIN payment_methods pm ON pm.id = pd.payment_method_id
        WHERE p.payment_group_id = $1
        GROUP BY pm.name`,
      [payment.paymentGroupId]
    );

    let commission: any[] | undefined;
    if (canSeeCommission) {
      const { rows } = await pool.query(
        commissionQuery.replace(
          '%CONDITION%',
          `ce.appointment_id IN (SELECT appointment_id FROM payments WHERE payment_group_id = $1)
             OR ce.appointment_service_id IN (
                  SELECT aps2.id FROM appointment_services aps2
                  JOIN payments p2 ON p2.appointment_id = aps2.appointment_id
                 WHERE p2.payment_group_id = $1
                )`
        ),
        [payment.paymentGroupId]
      );
      commission = rows;
    }

    return NextResponse.json({
      receiptNumber: g.receiptNumber,
      subtotal: g.subtotal,
      discountAmount: g.discountAmount,
      tipAmount: g.tipAmount,
      totalAmount: g.totalAmount,
      paidAmount: g.totalAmount,
      paymentStatus: 'PAID',
      cashierName: payment.cashierName,
      isGroup: true,
      serviceLines: lineRows,
      details: methodRows,
      commission,
    });
  }

  const { rows: detailRows } = await pool.query(
    `SELECT pd.amount::float8 AS amount, pd.reference, pm.name AS "methodName"
     FROM payment_details pd
     JOIN payment_methods pm ON pm.id = pd.payment_method_id
     WHERE pd.payment_id = $1
     ORDER BY pd.id`,
    [payment.id]
  );

  let commission: any[] | undefined;
  if (canSeeCommission) {
    const { rows } = await pool.query(
      commissionQuery.replace(
        '%CONDITION%',
        `ce.appointment_id = $1
           OR ce.appointment_service_id IN (SELECT id FROM appointment_services WHERE appointment_id = $1)`
      ),
      [appointmentId]
    );
    commission = rows;
  }

  return NextResponse.json({ ...payment, details: detailRows, commission });
}
