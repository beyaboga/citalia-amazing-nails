import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission, resolveTechnicianScope } from '@/lib/auth';
import { resolveDiscount } from '@/lib/discounts';
import { PRICE_AND_CODE_ERROR, PRICE_REASON_REQUIRED_ERROR } from '@/lib/pricing';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress'];

/** Suma minutos a una hora 'HH:MM' y devuelve 'HH:MM'. */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD&technicianId=&status=
 * Devuelve las citas del rango visible en el calendario.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status');
  const requestedTechnician = searchParams.get('technicianId');

  if (!from || !to) {
    return NextResponse.json({ error: 'Se requiere el rango de fechas' }, { status: 400 });
  }

  // Aquí se aplica el aislamiento: un técnico sin permiso de ver otras agendas
  // queda forzado a la suya aunque mande otro technicianId en la URL.
  const { technicianId } = resolveTechnicianScope(
    user,
    requestedTechnician ? Number(requestedTechnician) : null
  );

  const conditions = ['a.appointment_date BETWEEN $1 AND $2'];
  const values: unknown[] = [from, to];

  if (technicianId !== null) {
    values.push(technicianId);
    conditions.push(`a.technician_id = $${values.length}`);
  }
  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT
       a.id,
       a.customer_id AS "customerId",
       c.name AS "customerName",
       c.phone AS "customerPhone",
       a.technician_id AS "technicianId",
       u.name AS "technicianName",
       tm.color_hex AS "technicianColor",
       to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
       to_char(a.appointment_time, 'HH24:MI') AS "startTime",
       to_char(a.end_time, 'HH24:MI') AS "endTime",
       a.status,
       a.total_duration_minutes AS "durationMinutes",
       a.total_price::float8 AS "totalPrice",
       a.notes,
       COALESCE(svc.names, '{}') AS services
     FROM appointments a
     JOIN customers c ON c.id = a.customer_id
     LEFT JOIN users u ON u.id = a.technician_id
     LEFT JOIN team_members tm ON tm.user_id = a.technician_id
     LEFT JOIN (
       SELECT aps.appointment_id, array_agg(s.name ORDER BY s.name) AS names
       FROM appointment_services aps
       JOIN services s ON s.id = aps.service_id
       GROUP BY aps.appointment_id
     ) svc ON svc.appointment_id = a.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.appointment_date, a.appointment_time`,
    values
  );

  // El teléfono del cliente solo se muestra a quien tiene customers.manage.
  if (!hasPermission(user, 'customers.manage')) {
    for (const row of rows) row.customerPhone = null;
  }

  return NextResponse.json(rows);
}

/** POST /api/appointments — crear cita desde el calendario o el formulario. */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const customerId = Number(body?.customerId);
  const date = String(body?.date ?? '');
  const startTime = String(body?.startTime ?? '');
  const notes = String(body?.notes ?? '').trim();
  const status = String(body?.status ?? 'pending');
  const serviceIds: number[] = Array.isArray(body?.serviceIds)
    ? body.serviceIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v))
    : [];

  // Cantidad por servicio: cada unidad se agenda como una línea propia (así el mismo
  // servicio puede ir varias veces). Se acota entre 1 y 20 en el servidor.
  const quantitiesInput: Record<string, unknown> =
    body?.quantities && typeof body.quantities === 'object' ? body.quantities : {};
  const qtyOf = (serviceId: number): number => {
    const raw = Math.floor(Number(quantitiesInput[serviceId]));
    return Number.isFinite(raw) && raw >= 1 ? Math.min(20, raw) : 1;
  };

  // Precios personalizados por servicio { serviceId: precio }. Solo se respetan si
  // el usuario tiene permiso de modificar precios; de lo contrario se ignoran y se
  // usa el precio del catálogo. Esta es la validación de permiso en el backend.
  const canModifyPricing = hasPermission(user, 'pricing.modify');
  const priceOverrides: Record<number, number> =
    canModifyPricing && body?.servicePrices && typeof body.servicePrices === 'object'
      ? Object.fromEntries(
          Object.entries(body.servicePrices)
            .map(([id, price]) => [Number(id), Number(price)])
            .filter(([id, price]) => Number.isInteger(id) && Number.isFinite(price) && price >= 0)
        )
      : {};
  // Motivo del cambio de precio, obligatorio en cuanto un precio difiera del catálogo.
  const priceReason = String(body?.priceReason ?? '').trim();

  // El código solo cuenta si el usuario puede aplicarlo; si no, se ignora sin más.
  const discountCode = hasPermission(user, 'discounts.apply')
    ? String(body?.discountCode ?? '').trim()
    : '';

  // Un técnico sin `appointments.manage.any` solo puede crear citas en su agenda,
  // sin importar qué técnico venga en el cuerpo de la petición.
  const canManageAny = hasPermission(user, 'appointments.manage.any');
  const technicianId = canManageAny ? Number(body?.technicianId) : user.id;

  if (!customerId) return NextResponse.json({ error: 'Debe seleccionar un cliente' }, { status: 400 });
  if (!technicianId) return NextResponse.json({ error: 'Debe seleccionar un técnico' }, { status: 400 });
  if (!date || !startTime) {
    return NextResponse.json({ error: 'Debe indicar fecha y hora' }, { status: 400 });
  }
  if (serviceIds.length === 0) {
    return NextResponse.json({ error: 'Debe seleccionar al menos un servicio' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // La duración y el precio se toman del catálogo, nunca del cliente: así el
    // navegador no puede inventar un precio ni una duración distinta.
    const { rows: serviceRows } = await client.query(
      'SELECT id, name, price, duration_minutes AS "durationMinutes" FROM services WHERE id = ANY($1)',
      [serviceIds]
    );

    if (serviceRows.length !== serviceIds.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Uno de los servicios ya no existe' }, { status: 400 });
    }

    // Precio aplicado por servicio: el personalizado si se envió (y el usuario tiene
    // permiso), o el del catálogo. Nunca se toca el catálogo — solo esta cita.
    const appliedPrice = (s: { id: number; price: string }) =>
      priceOverrides[s.id] !== undefined ? priceOverrides[s.id] : Number(s.price);

    const totalDuration = serviceRows.reduce((sum, s) => sum + s.durationMinutes * qtyOf(s.id), 0);
    const totalPrice = serviceRows.reduce((sum, s) => sum + appliedPrice(s) * qtyOf(s.id), 0);
    const endTime = addMinutes(startTime, totalDuration);

    // El cambio de precio es el único ajuste manual del total: exige motivo y no
    // puede combinarse con un código de descuento.
    const hasPriceChange = serviceRows.some((s) => appliedPrice(s) !== Number(s.price));
    if (hasPriceChange && !priceReason) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: PRICE_REASON_REQUIRED_ERROR }, { status: 400 });
    }
    if (hasPriceChange && discountCode) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: PRICE_AND_CODE_ERROR }, { status: 400 });
    }

    const { rows } = await client.query(
      `INSERT INTO appointments (
         customer_id, technician_id, appointment_date, appointment_time, end_time,
         status, total_duration_minutes, total_price, notes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        customerId,
        technicianId,
        date,
        startTime,
        endTime,
        status,
        totalDuration,
        totalPrice,
        notes || null,
        user.id,
      ]
    );

    const appointmentId = rows[0].id;

    for (const service of serviceRows) {
      const price = appliedPrice(service);
      // Una línea por unidad: si la cantidad es 2, se agenda el servicio dos veces.
      // Así el pago (suma por línea) y las comisiones (una por línea) salen correctos.
      for (let unit = 0; unit < qtyOf(service.id); unit++) {
        const { rows: lineRows } = await client.query(
          `INSERT INTO appointment_services
             (appointment_id, service_id, price_at_booking, original_price, duration_at_booking)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [appointmentId, service.id, price, service.price, service.durationMinutes]
        );

        // Si el precio aplicado difiere del catálogo, queda constancia en el historial
        // junto con el motivo del cambio.
        if (price !== Number(service.price)) {
          await client.query(
            `INSERT INTO appointment_price_history
               (appointment_id, appointment_service_id, service_id, original_price, new_price, modified_by, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [appointmentId, lineRows[0].id, service.id, service.price, price, user.id, priceReason]
          );
        }
      }
    }

    // Sobre el subtotal (ya con los precios aplicados) solo puede ir un código de
    // descuento. Se re-valida aquí contra el subtotal real; el uso del código se
    // incrementa en la misma transacción para que no se pueda exceder el límite con
    // peticiones simultáneas.
    if (discountCode) {
      const result = await resolveDiscount(client, {
        code: discountCode,
        customerId,
        serviceIds,
        subtotal: totalPrice,
      });

      if (!result.ok) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }

      const d = result.discount;
      await client.query(
        `INSERT INTO appointment_discounts (
           appointment_id, discount_type, discount_code_id, discount_code, discount_name,
           value_type, discount_value, discount_amount, original_total, final_total, applied_by
         ) VALUES ($1,'CODE',$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          appointmentId,
          d.discountCodeId,
          d.code,
          d.name,
          d.discountType,
          d.discountValue,
          d.discountAmount,
          d.subtotal,
          d.totalAfter,
          user.id,
        ]
      );
      await client.query('UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = $1', [
        d.discountCodeId,
      ]);
    }

    await client.query('COMMIT');

    return NextResponse.json({ id: appointmentId, endTime, totalDuration, totalPrice }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');

    // 23P01 = violación de la restricción de exclusión: el técnico ya tenía una
    // cita traslapada. La base es la que garantiza esto, incluso con peticiones
    // simultáneas que pasarían una validación previa hecha por separado.
    if (error?.code === '23P01') {
      return NextResponse.json(
        { error: 'El técnico seleccionado ya tiene una cita en ese horario' },
        { status: 409 }
      );
    }

    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Error al guardar la cita' }, { status: 500 });
  } finally {
    client.release();
  }
}
