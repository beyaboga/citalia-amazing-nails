import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission, requirePermission } from '@/lib/auth';

const DEFAULT_IMAGE = '/assets/images/no_image.png';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // El teléfono solo se entrega a quien puede ver el perfil completo (customers.manage).
  const user = await getSession();
  const canViewContact = Boolean(user && hasPermission(user, 'customers.manage'));

  const { rows } = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c.email,
      c.phone,
      COALESCE(c.image_url, '${DEFAULT_IMAGE}') AS image,
      COALESCE(c.image_alt, c.name) AS "imageAlt",
      c.status,
      to_char(c.registration_date, 'DD/MM/YYYY') AS "registrationDate",
      to_char(c.last_visit, 'DD/MM/YYYY') AS "lastVisit",
      to_char(c.birthday, 'DD/MM/YYYY') AS birthday,
      c.birthday::text AS "birthdayIso",
      c.address,
      c.image_url AS "imageUrl",
      COALESCE(c.preferred_contact_methods, '{}') AS "preferredContactMethods",
      COALESCE(c.preferred_time_slots, '{}') AS "preferredTimeSlots",
      c.color_preferences AS "colorPreferences",
      c.marketing_consent AS "marketingConsent",
      c.appointment_reminders AS "appointmentReminders",
      c.promotional_emails AS "promotionalEmails",
      c.allergies,
      c.special_requirements AS "specialRequirements",
      COALESCE(c.referral_tags, '{}') AS "referralTags",
      c.emergency_contact AS "emergencyContact",
      c.emergency_phone AS "emergencyPhone",
      c.preferred_technician_id AS "preferredTechnicianId",
      COALESCE(favids.ids, '{}') AS "favoriteServiceIds",
      0 AS "loyaltyPoints",
      COALESCE(stats.total_appointments, 0)::int AS "totalAppointments",
      COALESCE(stats.lifetime_value, 0)::numeric AS "lifetimeValue",
      COALESCE(favs.service_preferences, '{}') AS "servicePreferences"
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, COUNT(*) AS total_appointments, SUM(total_price) AS lifetime_value
      FROM appointments
      WHERE status = 'completed'
      GROUP BY customer_id
    ) stats ON stats.customer_id = c.id
    LEFT JOIN (
      SELECT cfs.customer_id, array_agg(s.name ORDER BY s.name) AS service_preferences
      FROM customer_favorite_services cfs
      JOIN services s ON s.id = cfs.service_id
      GROUP BY cfs.customer_id
    ) favs ON favs.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, array_agg(service_id) AS ids
      FROM customer_favorite_services
      GROUP BY customer_id
    ) favids ON favids.customer_id = c.id
    WHERE c.id = $1
    `,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  if (!canViewContact) {
    rows[0].phone = null;
    rows[0].email = null;
    rows[0].emergencyPhone = null;
    rows[0].emergencyContact = null;
    rows[0].lifetimeValue = null;
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Solo quien gestiona clientes puede editarlos.
  const auth = await requirePermission('customers.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    fields.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (body.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(body.email ? String(body.email).trim() : null);
  }

  if (body.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(body.phone ? String(body.phone).trim() : null);
  }

  if (body.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(body.status);
  }

  if (body.birthday !== undefined) {
    fields.push(`birthday = $${paramIndex++}`);
    values.push(body.birthday || null);
  }

  if (body.address !== undefined) {
    fields.push(`address = $${paramIndex++}`);
    values.push(body.address || null);
  }

  if (body.preferredContactMethods !== undefined) {
    fields.push(`preferred_contact_methods = $${paramIndex++}`);
    values.push(Array.isArray(body.preferredContactMethods) ? body.preferredContactMethods : []);
  }

  if (body.specialRequirements !== undefined) {
    fields.push(`special_requirements = $${paramIndex++}`);
    values.push(body.specialRequirements || null);
  }

  if (body.imageUrl !== undefined) {
    fields.push(`image_url = $${paramIndex++}`);
    values.push(body.imageUrl || null);
  }

  if (body.preferredTimeSlots !== undefined) {
    fields.push(`preferred_time_slots = $${paramIndex++}`);
    values.push(Array.isArray(body.preferredTimeSlots) ? body.preferredTimeSlots : []);
  }

  if (body.colorPreferences !== undefined) {
    fields.push(`color_preferences = $${paramIndex++}`);
    values.push(body.colorPreferences || null);
  }

  if (body.marketingConsent !== undefined) {
    fields.push(`marketing_consent = $${paramIndex++}`);
    values.push(Boolean(body.marketingConsent));
  }

  if (body.appointmentReminders !== undefined) {
    fields.push(`appointment_reminders = $${paramIndex++}`);
    values.push(Boolean(body.appointmentReminders));
  }

  if (body.promotionalEmails !== undefined) {
    fields.push(`promotional_emails = $${paramIndex++}`);
    values.push(Boolean(body.promotionalEmails));
  }

  if (body.allergies !== undefined) {
    fields.push(`allergies = $${paramIndex++}`);
    values.push(body.allergies || null);
  }

  if (body.referralTags !== undefined) {
    fields.push(`referral_tags = $${paramIndex++}`);
    values.push(Array.isArray(body.referralTags) ? body.referralTags : []);
  }

  if (body.emergencyContact !== undefined) {
    fields.push(`emergency_contact = $${paramIndex++}`);
    values.push(body.emergencyContact || null);
  }

  if (body.emergencyPhone !== undefined) {
    fields.push(`emergency_phone = $${paramIndex++}`);
    values.push(body.emergencyPhone || null);
  }

  if (body.preferredTechnicianId !== undefined) {
    const technicianId = Number(body.preferredTechnicianId);
    fields.push(`preferred_technician_id = $${paramIndex++}`);
    values.push(Number.isInteger(technicianId) && technicianId > 0 ? technicianId : null);
  }

  const favoriteServiceIds: number[] | null = Array.isArray(body.favoriteServiceIds)
    ? body.favoriteServiceIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v))
    : null;

  if (fields.length === 0 && favoriteServiceIds === null) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (fields.length > 0) {
      values.push(id);
      const { rows } = await client.query(
        `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
        values
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
    }

    if (favoriteServiceIds !== null) {
      // Se reemplaza la selección completa: borrar y reinsertar es más simple
      // que reconciliar altas y bajas una por una.
      await client.query('DELETE FROM customer_favorite_services WHERE customer_id = $1', [id]);

      if (favoriteServiceIds.length > 0) {
        const placeholders = favoriteServiceIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO customer_favorite_services (customer_id, service_id)
           VALUES ${placeholders}
           ON CONFLICT DO NOTHING`,
          [id, ...favoriteServiceIds]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un cliente registrado con ese correo electrónico' },
        { status: 409 }
      );
    }

    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Error al actualizar el cliente' }, { status: 500 });
  } finally {
    client.release();
  }
}
