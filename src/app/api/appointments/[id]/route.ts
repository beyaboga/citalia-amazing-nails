import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { resolveDiscount } from '@/lib/discounts';
import { PRICE_AND_CODE_ERROR, PRICE_REASON_REQUIRED_ERROR } from '@/lib/pricing';

type RouteContext = { params: Promise<{ id: string }> };

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Comprueba que el usuario pueda tocar esta cita concreta.
 * Sin `appointments.manage.any`, solo puede tocar las suyas.
 */
async function loadEditableAppointment(appointmentId: number, userId: number, canManageAny: boolean) {
  const { rows } = await pool.query(
    'SELECT id, technician_id AS "technicianId" FROM appointments WHERE id = $1',
    [appointmentId]
  );
  if (rows.length === 0) return { error: 'Cita no encontrada', status: 404 as const };
  if (!canManageAny && rows[0].technicianId !== userId) {
    return { error: 'No tiene permiso para modificar esta cita', status: 403 as const };
  }
  return { appointment: rows[0] };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await context.params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT
       a.id,
       a.customer_id AS "customerId",
       c.name AS "customerName",
       c.phone AS "customerPhone",
       a.technician_id AS "technicianId",
       u.name AS "technicianName",
       to_char(a.appointment_date, 'YYYY-MM-DD') AS date,
       to_char(a.appointment_time, 'HH24:MI') AS "startTime",
       to_char(a.end_time, 'HH24:MI') AS "endTime",
       a.status,
       a.total_duration_minutes AS "durationMinutes",
       a.total_price::float8 AS "totalPrice",
       a.notes,
       COALESCE(svc.ids, '{}') AS "serviceIds",
       COALESCE(svc.names, '{}') AS services,
       COALESCE(svc.lines, '[]') AS "serviceLines"
     FROM appointments a
     JOIN customers c ON c.id = a.customer_id
     LEFT JOIN users u ON u.id = a.technician_id
     LEFT JOIN (
       SELECT aps.appointment_id,
              array_agg(s.id ORDER BY s.name) AS ids,
              array_agg(s.name ORDER BY s.name) AS names,
              json_agg(
                json_build_object(
                  'serviceId', s.id,
                  'name', s.name,
                  'price', aps.price_at_booking::float8,
                  'originalPrice', aps.original_price::float8,
                  'catalogPrice', s.price::float8
                ) ORDER BY s.name
              ) AS lines
       FROM appointment_services aps
       JOIN services s ON s.id = aps.service_id
       GROUP BY aps.appointment_id
     ) svc ON svc.appointment_id = a.id
     WHERE a.id = $1`,
    [appointmentId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  // Descuentos aplicados (código y/o ajuste manual), para que al editar la cita se
  // vean tal cual quedaron y no se pierdan.
  const { rows: discountRows } = await pool.query(
    `SELECT
       discount_type AS "discountType",
       discount_code AS "discountCode",
       discount_name AS "discountName",
       value_type AS "valueType",
       discount_value::float8 AS "discountValue",
       discount_amount::float8 AS "discountAmount",
       original_total::float8 AS "originalTotal",
       final_total::float8 AS "finalTotal",
       reason,
       to_char(applied_at, 'DD/MM/YYYY HH24:MI') AS "appliedAt"
     FROM appointment_discounts
     WHERE appointment_id = $1
     ORDER BY id`,
    [appointmentId]
  );

  const appointment = { ...rows[0], discounts: discountRows };
  const canManageAny =
    hasPermission(user, 'appointments.manage.any') || hasPermission(user, 'appointments.view.any');

  if (!canManageAny && appointment.technicianId !== user.id) {
    return NextResponse.json({ error: 'No tiene permiso para ver esta cita' }, { status: 403 });
  }

  // El teléfono del cliente solo se muestra a quien tiene customers.manage.
  if (!hasPermission(user, 'customers.manage')) {
    appointment.customerPhone = null;
  }

  return NextResponse.json(appointment);
}

/**
 * PATCH /api/appointments/[id]
 * Sirve tanto para editar el detalle como para mover la cita arrastrándola
 * (en ese caso el cuerpo trae solo date / startTime / technicianId).
 */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await context.params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const canManageAny = hasPermission(user, 'appointments.manage.any');
  const check = await loadEditableAppointment(appointmentId, user.id, canManageAny);
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();

  // Precios personalizados por servicio { serviceId: precio }. Solo se respetan con
  // permiso `pricing.modify` (validación de permiso en el backend).
  const canModifyPricing = hasPermission(user, 'pricing.modify');
  const priceOverrides: Record<number, number> =
    canModifyPricing && body?.servicePrices && typeof body.servicePrices === 'object'
      ? Object.fromEntries(
          Object.entries(body.servicePrices)
            .map(([id, price]) => [Number(id), Number(price)])
            .filter(([id, price]) => Number.isInteger(id) && Number.isFinite(price) && price >= 0)
        )
      : {};
  const hasOverrides = Object.keys(priceOverrides).length > 0;
  // Motivo del cambio manual de precio (ej. "Cliente frecuente"), para la auditoría.
  const priceReason = String(body?.priceReason ?? '').trim();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Precios ya aplicados en esta cita, ANTES de tocar nada. Son la base para no
    // perder descuentos o ajustes cuando se reeditan los servicios: si un servicio
    // ya estaba en la cita, conserva su precio aplicado salvo que se envíe uno nuevo
    // con permiso.
    const { rows: existingLines } = await client.query(
      `SELECT service_id AS "serviceId",
              price_at_booking::float8 AS applied,
              original_price::float8 AS original
       FROM appointment_services WHERE appointment_id = $1`,
      [appointmentId]
    );
    const existingByService = new Map<number, { applied: number; original: number }>(
      existingLines.map((line) => [line.serviceId, { applied: line.applied, original: line.original }])
    );

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.customerId !== undefined) {
      fields.push(`customer_id = $${i++}`);
      values.push(Number(body.customerId));
    }

    if (body.technicianId !== undefined) {
      // Reasignar la cita a otro técnico requiere permiso amplio; un técnico
      // no puede pasarle su cita a alguien más ni robarse la de otro.
      if (!canManageAny && Number(body.technicianId) !== user.id) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'No tiene permiso para asignar citas a otro técnico' },
          { status: 403 }
        );
      }
      fields.push(`technician_id = $${i++}`);
      values.push(Number(body.technicianId));
    }

    if (body.date !== undefined) {
      fields.push(`appointment_date = $${i++}`);
      values.push(body.date);
    }

    if (body.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(body.status);
    }

    if (body.notes !== undefined) {
      fields.push(`notes = $${i++}`);
      values.push(body.notes || null);
    }

    // Si cambian los servicios se recalculan duración, precio y hora de fin.
    const serviceIds: number[] | null = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v))
      : null;

    let duration: number | null = null;
    let serviceRows: any[] = [];

    // Precio aplicado por servicio, en orden de prioridad:
    //   1. el enviado ahora (solo si el usuario puede modificar precios),
    //   2. el que YA tenía la cita — así reeditar no revierte un descuento o ajuste,
    //   3. el del catálogo (solo si el servicio se acaba de agregar).
    const appliedPrice = (s: { id: number; price: string }) => {
      if (priceOverrides[s.id] !== undefined) return priceOverrides[s.id];
      const existing = existingByService.get(s.id);
      return existing ? existing.applied : Number(s.price);
    };

    // Precio original del catálogo: el que ya tenía la línea, o el vigente si es nueva.
    const originalPrice = (s: { id: number; price: string }) =>
      existingByService.get(s.id)?.original ?? Number(s.price);

    if (serviceIds && serviceIds.length > 0) {
      const result = await client.query(
        'SELECT id, price, duration_minutes AS "durationMinutes" FROM services WHERE id = ANY($1)',
        [serviceIds]
      );
      serviceRows = result.rows;
      duration = serviceRows.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalPrice = serviceRows.reduce((sum, s) => sum + appliedPrice(s), 0);

      fields.push(`total_duration_minutes = $${i++}`);
      values.push(duration);
      fields.push(`total_price = $${i++}`);
      values.push(totalPrice);
    }

    if (body.startTime !== undefined) {
      // Al mover una cita se conserva su duración salvo que hayan cambiado los
      // servicios; así arrastrarla no altera cuánto dura.
      if (duration === null) {
        const { rows } = await client.query(
          'SELECT total_duration_minutes AS "durationMinutes" FROM appointments WHERE id = $1',
          [appointmentId]
        );
        duration = rows[0].durationMinutes;
      }
      fields.push(`appointment_time = $${i++}`);
      values.push(body.startTime);
      fields.push(`end_time = $${i++}`);
      values.push(addMinutes(String(body.startTime), duration ?? 0));
    } else if (duration !== null) {
      const { rows } = await client.query(
        `SELECT to_char(appointment_time, 'HH24:MI') AS "startTime" FROM appointments WHERE id = $1`,
        [appointmentId]
      );
      fields.push(`end_time = $${i++}`);
      values.push(addMinutes(rows[0].startTime, duration));
    }

    // Aplicar o quitar un descuento es por sí solo un cambio válido, aunque no se
    // toque ningún otro campo de la cita.
    const wantsCodeChange = 'discountCode' in body && hasPermission(user, 'discounts.apply');

    if (fields.length === 0 && !serviceIds && !hasOverrides && !wantsCodeChange) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 });
    }

    // El cambio de precio es el único ajuste manual del total, y siempre lleva motivo.
    // Solo se exige por lo que cambia AHORA y se aparta del catálogo: un cambio de una
    // edición anterior ya tiene el suyo en el historial, y volver al precio de catálogo
    // es deshacer, no un cambio que haya que justificar.
    const changesPriceNow = serviceIds
      ? serviceRows.some((s) => {
          const price = appliedPrice(s);
          return (
            price !== (existingByService.get(s.id)?.applied ?? Number(s.price)) &&
            price !== originalPrice(s)
          );
        })
      : existingLines.some((line) => {
          const override = priceOverrides[line.serviceId];
          return override !== undefined && override !== line.applied && override !== line.original;
        });

    if (changesPriceNow && !priceReason) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: PRICE_REASON_REQUIRED_ERROR }, { status: 400 });
    }

    if (fields.length > 0) {
      values.push(appointmentId);
      await client.query(`UPDATE appointments SET ${fields.join(', ')} WHERE id = $${i}`, values);
    }

    if (serviceIds) {
      // Cambió el conjunto de servicios: se rehace, aplicando precios personalizados
      // y dejando constancia de los que difieren del catálogo.
      await client.query('DELETE FROM appointment_services WHERE appointment_id = $1', [appointmentId]);
      for (const service of serviceRows) {
        const price = appliedPrice(service);
        const original = originalPrice(service);
        // El historial registra el cambio real: del precio que tenía al nuevo.
        const previous = existingByService.get(service.id)?.applied ?? original;

        const { rows: lineRows } = await client.query(
          `INSERT INTO appointment_services
             (appointment_id, service_id, price_at_booking, original_price, duration_at_booking)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [appointmentId, service.id, price, original, service.durationMinutes]
        );

        if (price !== previous) {
          await client.query(
            `INSERT INTO appointment_price_history
               (appointment_id, appointment_service_id, service_id, original_price, new_price, modified_by, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [appointmentId, lineRows[0].id, service.id, previous, price, user.id, priceReason || null]
          );
        }
      }
    } else if (hasOverrides) {
      // Edición de solo precios (sin cambiar los servicios): se actualiza cada línea,
      // se registra el cambio y se recalcula el total.
      const { rows: lines } = await client.query(
        `SELECT id, service_id AS "serviceId", price_at_booking::float8 AS current
         FROM appointment_services WHERE appointment_id = $1`,
        [appointmentId]
      );
      for (const line of lines) {
        const override = priceOverrides[line.serviceId];
        if (override !== undefined && override !== line.current) {
          await client.query('UPDATE appointment_services SET price_at_booking = $1 WHERE id = $2', [
            override,
            line.id,
          ]);
          await client.query(
            `INSERT INTO appointment_price_history
               (appointment_id, appointment_service_id, service_id, original_price, new_price, modified_by, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [appointmentId, line.id, line.serviceId, line.current, override, user.id, priceReason || null]
          );
        }
      }
      const { rows: sumRows } = await client.query(
        'SELECT COALESCE(SUM(price_at_booking), 0)::float8 AS total FROM appointment_services WHERE appointment_id = $1',
        [appointmentId]
      );
      await client.query('UPDATE appointments SET total_price = $1 WHERE id = $2', [
        sumRows[0].total,
        appointmentId,
      ]);
    }

    // ---- Descuentos de la cita ----
    // Se recalcula el total siempre que algo lo afecte. El descuento ya aplicado se
    // conserva aunque quien edite no tenga permiso para cambiarlo: solo se pierde si
    // se pide quitar explícitamente.
    const moneyChanged = Boolean(serviceIds) || hasOverrides || wantsCodeChange;

    if (moneyChanged) {
      const { rows: subtotalRows } = await client.query(
        'SELECT COALESCE(SUM(price_at_booking), 0)::float8 AS subtotal FROM appointment_services WHERE appointment_id = $1',
        [appointmentId]
      );
      const subtotal = subtotalRows[0].subtotal;

      const { rows: apptRows } = await client.query(
        'SELECT customer_id AS "customerId" FROM appointments WHERE id = $1',
        [appointmentId]
      );
      const { rows: svcRows2 } = await client.query(
        'SELECT service_id AS "serviceId" FROM appointment_services WHERE appointment_id = $1',
        [appointmentId]
      );
      const currentServiceIds = svcRows2.map((r) => r.serviceId);

      // --- Descuento por código ---
      const { rows: oldCodeRows } = await client.query(
        `SELECT discount_code_id AS "codeId", discount_code AS "code"
         FROM appointment_discounts WHERE appointment_id = $1 AND discount_type = 'CODE'`,
        [appointmentId]
      );
      const oldCode = oldCodeRows[0] ?? null;

      let codeToApply: string | null = oldCode?.code ?? null;
      if (wantsCodeChange) {
        codeToApply = body.discountCode ? String(body.discountCode).trim() : null;
      }

      // Código y cambio de precio son excluyentes: se comprueba contra el estado ya
      // guardado, así da igual cuál de los dos se aplicara primero.
      if (codeToApply) {
        const { rows: changedRows } = await client.query(
          `SELECT 1 FROM appointment_services
            WHERE appointment_id = $1 AND price_at_booking <> original_price
            LIMIT 1`,
          [appointmentId]
        );
        if (changedRows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: PRICE_AND_CODE_ERROR }, { status: 400 });
        }
      }

      let newCode = null;
      if (codeToApply) {
        const result = await resolveDiscount(client, {
          code: codeToApply,
          customerId: apptRows[0].customerId,
          serviceIds: currentServiceIds,
          subtotal,
        });
        if (!result.ok) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: result.reason }, { status: 409 });
        }
        newCode = result.discount;
      }

      // El contador de usos solo cambia si cambió el código, no al recalcular montos.
      const oldCodeId = oldCode?.codeId ?? null;
      const newCodeId = newCode?.discountCodeId ?? null;
      if (oldCodeId !== newCodeId) {
        if (oldCodeId) {
          await client.query(
            'UPDATE discount_codes SET current_uses = GREATEST(current_uses - 1, 0) WHERE id = $1',
            [oldCodeId]
          );
        }
        if (newCodeId) {
          await client.query('UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = $1', [
            newCodeId,
          ]);
        }
      }

      await client.query(
        `DELETE FROM appointment_discounts WHERE appointment_id = $1 AND discount_type = 'CODE'`,
        [appointmentId]
      );
      if (newCode) {
        await client.query(
          `INSERT INTO appointment_discounts (
             appointment_id, discount_type, discount_code_id, discount_code, discount_name,
             value_type, discount_value, discount_amount, original_total, final_total, applied_by
           ) VALUES ($1,'CODE',$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            appointmentId,
            newCode.discountCodeId,
            newCode.code,
            newCode.name,
            newCode.discountType,
            newCode.discountValue,
            newCode.discountAmount,
            newCode.subtotal,
            newCode.totalAfter,
            user.id,
          ]
        );
      }

      // --- Ajuste manual heredado ---
      // Ya no se crean ajustes manuales del total (el cambio de precio los sustituye),
      // pero los de citas antiguas se conservan: se reajusta el total conservando el
      // MONTO pactado, para que siga siendo el mismo descuento aunque cambie el resto.
      const afterCode = newCode ? newCode.totalAfter : subtotal;

      const { rows: oldManualRows } = await client.query(
        `SELECT discount_amount::float8 AS amount, reason
         FROM appointment_discounts WHERE appointment_id = $1 AND discount_type = 'MANUAL'`,
        [appointmentId]
      );
      const oldManual = oldManualRows[0] ?? null;

      if (oldManual) {
        const manualTarget = Math.max(0, Math.round((afterCode - oldManual.amount) * 100) / 100);
        const adjustment = Math.round((afterCode - manualTarget) * 100) / 100;
        await client.query(
          `DELETE FROM appointment_discounts WHERE appointment_id = $1 AND discount_type = 'MANUAL'`,
          [appointmentId]
        );
        if (adjustment > 0) {
          await client.query(
            `INSERT INTO appointment_discounts (
               appointment_id, discount_type, discount_name, reason,
               discount_value, discount_amount, original_total, final_total, applied_by
             ) VALUES ($1,'MANUAL','Ajuste manual',$2,$3,$3,$4,$5,$6)`,
            [appointmentId, oldManual.reason || null, adjustment, afterCode, manualTarget, user.id]
          );
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23P01') {
      return NextResponse.json(
        { error: 'El técnico seleccionado ya tiene una cita en ese horario' },
        { status: 409 }
      );
    }

    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Error al actualizar la cita' }, { status: 500 });
  } finally {
    client.release();
  }
}
