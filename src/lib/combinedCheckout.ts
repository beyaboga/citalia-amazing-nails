/**
 * Helpers de servidor para el cobro combinado (varias citas del mismo cliente en un
 * solo pago/recibo). Cada cita conserva su propio `payments` — el trigger de
 * comisiones (018) genera la comisión de su técnica sin cambios. Ver [[combined-checkout]].
 */

interface Queryable {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ServiceLine {
  serviceId: number;
  name: string;
  price: number;
}

export interface AppointmentBilling {
  appointmentId: number;
  customerId: number;
  customerName: string;
  date: string;
  technicianName: string | null;
  serviceLines: ServiceLine[];
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
}

/** Datos de facturación de una cita (servicios, subtotal, descuento), desde la base. */
export async function loadAppointmentBilling(db: Queryable, appointmentId: number): Promise<AppointmentBilling | null> {
  const { rows } = await db.query(
    `SELECT a.id AS "appointmentId", a.customer_id AS "customerId", c.name AS "customerName",
            to_char(a.appointment_date, 'YYYY-MM-DD') AS date, u.name AS "technicianName"
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       LEFT JOIN users u ON u.id = a.technician_id
      WHERE a.id = $1`,
    [appointmentId]
  );
  if (rows.length === 0) return null;
  const appt = rows[0];

  const { rows: lines } = await db.query(
    `SELECT s.id AS "serviceId", s.name, aps.price_at_booking::float8 AS price
       FROM appointment_services aps
       JOIN services s ON s.id = aps.service_id
      WHERE aps.appointment_id = $1
      ORDER BY s.name`,
    [appointmentId]
  );
  const subtotal = round2(lines.reduce((s, l) => s + l.price, 0));

  const { rows: disc } = await db.query(
    `SELECT COALESCE(SUM(discount_amount), 0)::float8 AS total FROM appointment_discounts WHERE appointment_id = $1`,
    [appointmentId]
  );
  const discountAmount = round2(disc[0].total);

  return {
    ...appt,
    serviceLines: lines,
    subtotal,
    discountAmount,
    afterDiscount: round2(subtotal - discountAmount),
  };
}

/**
 * Otras citas del mismo cliente el mismo día, sin pago vigente y con servicios,
 * que se pueden cobrar junto con la cita dada.
 */
export async function findCombinable(db: Queryable, appointmentId: number): Promise<AppointmentBilling[]> {
  const { rows } = await db.query(
    `SELECT a.id
       FROM appointments a
      WHERE a.customer_id = (SELECT customer_id FROM appointments WHERE id = $1)
        AND a.appointment_date = (SELECT appointment_date FROM appointments WHERE id = $1)
        AND a.id <> $1
        AND a.status <> 'cancelled'
        AND EXISTS (SELECT 1 FROM appointment_services aps WHERE aps.appointment_id = a.id)
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.appointment_id = a.id AND p.voided_at IS NULL)
      ORDER BY a.appointment_time`,
    [appointmentId]
  );

  const result: AppointmentBilling[] = [];
  for (const r of rows) {
    const billing = await loadAppointmentBilling(db, r.id);
    if (billing && billing.subtotal > 0) result.push(billing);
  }
  return result;
}
