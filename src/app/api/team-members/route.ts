import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { hasPermission, requirePermission } from '@/lib/auth';
import { saveEmployeePayment } from '@/lib/payrollServer';

interface TimeSlotInput {
  start: string;
  end: string;
}

interface DayScheduleInput {
  dayOfWeek: number;
  enabled: boolean;
  slots: TimeSlotInput[];
}

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      u.id AS "userId",
      u.name,
      u.email,
      u.phone,
      u.is_active AS "isActive",
      r.name AS role,
      r.slug AS "roleSlug",
      tm.id AS "teamMemberId",
      tm.job_title AS "jobTitle",
      tm.employee_code AS "employeeCode",
      tm.color_hex AS "colorHex",
      to_char(tm.hire_date, 'DD/MM/YYYY') AS "hireDate",
      (tm.id IS NOT NULL) AS "isBookable",
      to_char(u.termination_date, 'DD/MM/YYYY') AS "terminationDate",
      (u.is_active AND (u.termination_date IS NULL OR u.termination_date >= CURRENT_DATE))
        AS "hasAccess"
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN team_members tm ON tm.user_id = u.id
    ORDER BY u.created_at DESC
  `);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const authz = await requirePermission('team.manage');
  if ('error' in authz) return NextResponse.json({ error: authz.error }, { status: authz.status });
  const viewer = authz.user;

  const body = await request.json();
  const personalInfo = body?.personalInfo ?? {};
  const professionalInfo = body?.professionalInfo ?? {};
  const schedule: DayScheduleInput[] = Array.isArray(body?.schedule) ? body.schedule : [];

  const name = String(personalInfo.name ?? '').trim();
  const email = String(personalInfo.email ?? '').trim();
  const phone = String(personalInfo.phone ?? '').trim();
  const password = String(personalInfo.password ?? '');
  const roleId = Number(body?.roleId);

  const terminationDate = personalInfo.terminationDate ? String(personalInfo.terminationDate) : null;

  const isBookable = Boolean(professionalInfo.isBookable);
  const jobTitle = String(professionalInfo.jobTitle ?? '').trim();
  const employeeCode = String(professionalInfo.employeeCode ?? '').trim();
  const colorHex = String(professionalInfo.colorHex ?? '').trim();
  const hireDate = professionalInfo.hireDate ? String(professionalInfo.hireDate) : null;
  const bio = String(professionalInfo.bio ?? '').trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El nombre es obligatorio (mínimo 2 caracteres)' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
  }
  if (!roleId) {
    return NextResponse.json({ error: 'Debe seleccionar un rol' }, { status: 400 });
  }
  if (isBookable && !jobTitle) {
    return NextResponse.json({ error: 'El puesto es obligatorio para personal reservable' }, { status: 400 });
  }
  if (terminationDate && hireDate && terminationDate < hireDate) {
    return NextResponse.json(
      { error: 'La fecha de finalización no puede ser anterior a la de contratación' },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role_id, termination_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role_id AS "roleId",
                 to_char(termination_date, 'DD/MM/YYYY') AS "terminationDate"`,
      [name, email, phone || null, passwordHash, roleId, terminationDate]
    );
    const user = userRows[0];

    let teamMember = null;

    if (isBookable) {
      const { rows: tmRows } = await client.query(
        `INSERT INTO team_members (user_id, employee_code, job_title, color_hex, hire_date, termination_date, bio)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, job_title AS "jobTitle", color_hex AS "colorHex"`,
        [user.id, employeeCode || null, jobTitle, colorHex || null, hireDate, terminationDate, bio || null]
      );
      teamMember = tmRows[0];

      for (const day of schedule) {
        const { rows: scheduleRows } = await client.query(
          `INSERT INTO team_member_schedules (team_member_id, day_of_week, enabled)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [teamMember.id, day.dayOfWeek, Boolean(day.enabled)]
        );
        const scheduleId = scheduleRows[0].id;

        for (const slot of day.slots ?? []) {
          if (!slot.start || !slot.end) continue;
          await client.query(
            `INSERT INTO team_member_schedule_slots (schedule_id, start_time, end_time)
             VALUES ($1, $2, $3)`,
            [scheduleId, slot.start, slot.end]
          );
        }
      }

      // Esquema de pago del empleado (config + comisiones), si viene y hay permiso.
      if (body?.payment && viewer && hasPermission(viewer, 'payroll.configure')) {
        await saveEmployeePayment(client, teamMember.id, name, body.payment, viewer.id);
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ ...user, teamMember }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un usuario registrado con ese correo electrónico' },
        { status: 409 }
      );
    }
    if (error?.code === '23503') {
      return NextResponse.json({ error: 'El rol seleccionado no existe' }, { status: 400 });
    }

    console.error('Error creating team member:', error);
    return NextResponse.json({ error: 'Error al guardar el miembro del equipo' }, { status: 500 });
  } finally {
    client.release();
  }
}
