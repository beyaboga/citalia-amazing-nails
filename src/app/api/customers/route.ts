import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

const DEFAULT_IMAGE = '/assets/images/no_image.png';

export async function GET() {
  // El teléfono es parte del perfil completo: solo lo ve quien tiene customers.manage.
  // El técnico (sin ese permiso) recibe el nombre pero el teléfono llega vacío.
  const user = await getSession();
  const canViewContact = Boolean(user && hasPermission(user, 'customers.manage'));

  const { rows } = await pool.query(`
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
    ORDER BY c.created_at DESC
  `);

  // Sin customers.manage: se oculta el contacto y el gasto histórico del cliente.
  if (!canViewContact) {
    for (const row of rows) {
      row.phone = null;
      row.email = null;
      row.lifetimeValue = null;
    }
  }

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  // customers.manage (gestión completa) o customers.create (solo alta, ej. técnico
  // registrando un cliente nuevo desde la agenda) habilitan crear clientes.
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'customers.manage') && !hasPermission(user, 'customers.create')) {
    return NextResponse.json({ error: 'No tiene permiso para realizar esta acción' }, { status: 403 });
  }

  const body = await request.json();
  const personalInfo = body?.personalInfo ?? {};
  const communicationPreferences = body?.communicationPreferences ?? {};
  const servicePreferences = body?.servicePreferences ?? {};
  const additionalInfo = body?.additionalInfo ?? {};

  const fullName = String(personalInfo.name ?? '').trim();
  const phone = String(personalInfo.phone ?? '').trim();
  const email = String(personalInfo.email ?? '').trim();

  if (!fullName) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const favoriteServiceIds = Array.isArray(servicePreferences.favoriteServices)
    ? servicePreferences.favoriteServices
        .map((id: unknown) => Number(id))
        .filter((id: number) => Number.isInteger(id))
    : [];

  const preferredTechnicianId = Number(servicePreferences.preferredTechnician);
  const technicianId =
    Number.isInteger(preferredTechnicianId) && preferredTechnicianId > 0 ? preferredTechnicianId : null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (
         name, email, phone, image_url, birthday, address,
         preferred_time_slots, color_preferences, preferred_contact_methods,
         marketing_consent, appointment_reminders, promotional_emails,
         allergies, special_requirements, referral_tags, emergency_contact, emergency_phone,
         preferred_technician_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING
         id, name, email, phone,
         COALESCE(image_url, '${DEFAULT_IMAGE}') AS image,
         COALESCE(image_alt, name) AS "imageAlt", status,
         to_char(registration_date, 'DD/MM/YYYY') AS "registrationDate",
         to_char(last_visit, 'DD/MM/YYYY') AS "lastVisit",
         to_char(birthday, 'DD/MM/YYYY') AS birthday`,
      [
        fullName,
        email || null,
        phone || null,
        personalInfo.photo || null,
        personalInfo.birthDate || null,
        personalInfo.address || null,
        servicePreferences.preferredTimeSlots ?? [],
        servicePreferences.colorPreferences || null,
        communicationPreferences.preferredContact ?? [],
        Boolean(communicationPreferences.marketingConsent),
        communicationPreferences.appointmentReminders ?? true,
        Boolean(communicationPreferences.promotionalEmails),
        additionalInfo.allergies || null,
        additionalInfo.specialRequirements || null,
        Array.isArray(additionalInfo.referralTags) ? additionalInfo.referralTags : [],
        additionalInfo.emergencyContact || null,
        additionalInfo.emergencyPhone || null,
        technicianId,
      ]
    );

    const customer = rows[0];
    let favoriteServiceNames: string[] = [];

    if (favoriteServiceIds.length > 0) {
      const valuePlaceholders = favoriteServiceIds.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
      const { rows: favRows } = await pool.query(
        `INSERT INTO customer_favorite_services (customer_id, service_id)
         VALUES ${valuePlaceholders}
         ON CONFLICT DO NOTHING
         RETURNING service_id`,
        [customer.id, ...favoriteServiceIds]
      );

      if (favRows.length > 0) {
        const { rows: nameRows } = await pool.query(
          'SELECT name FROM services WHERE id = ANY($1) ORDER BY name',
          [favRows.map((r) => r.service_id)]
        );
        favoriteServiceNames = nameRows.map((r) => r.name);
      }
    }

    return NextResponse.json(
      { ...customer, totalAppointments: 0, lifetimeValue: 0, servicePreferences: favoriteServiceNames },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un cliente registrado con ese correo electrónico' },
        { status: 409 }
      );
    }
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Error al guardar el cliente' }, { status: 500 });
  }
}
