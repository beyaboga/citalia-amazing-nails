import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { hasPermission, requirePermission } from '@/lib/auth';
import { loadEmployeePayment, saveEmployeePayment } from '@/lib/payrollServer';

interface TimeSlotInput {
  start: string;
  end: string;
}

interface DayScheduleInput {
  dayOfWeek: number;
  enabled: boolean;
  slots: TimeSlotInput[];
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authz = await requirePermission('team.manage');
  if ('error' in authz) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const { id } = await context.params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT
       u.id AS "userId",
       u.name,
       u.email,
       u.phone,
       u.role_id AS "roleId",
       u.is_active AS "isActive",
       to_char(u.termination_date, 'YYYY-MM-DD') AS "terminationDate",
       tm.id AS "teamMemberId",
       tm.job_title AS "jobTitle",
       tm.employee_code AS "employeeCode",
       tm.color_hex AS "colorHex",
       to_char(tm.hire_date, 'YYYY-MM-DD') AS "hireDate",
       tm.bio,
       (tm.id IS NOT NULL) AS "isBookable"
     FROM users u
     LEFT JOIN team_members tm ON tm.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Miembro del equipo no encontrado' }, { status: 404 });
  }

  const member = rows[0];
  let schedule: DayScheduleInput[] = [];

  if (member.teamMemberId) {
    const { rows: scheduleRows } = await pool.query(
      `SELECT
         s.day_of_week AS "dayOfWeek",
         s.enabled,
         COALESCE(
           json_agg(
             json_build_object(
               'start', to_char(slots.start_time, 'HH24:MI'),
               'end', to_char(slots.end_time, 'HH24:MI')
             ) ORDER BY slots.start_time
           ) FILTER (WHERE slots.id IS NOT NULL),
           '[]'
         ) AS slots
       FROM team_member_schedules s
       LEFT JOIN team_member_schedule_slots slots ON slots.schedule_id = s.id
       WHERE s.team_member_id = $1
       GROUP BY s.id
       ORDER BY s.day_of_week`,
      [member.teamMemberId]
    );
    schedule = scheduleRows;
  }

  // Esquema de pago (solo si el que consulta puede configurar nómina y el miembro
  // es reservable). Sin permiso, no se expone información salarial.
  let payment = null;
  if (member.teamMemberId && hasPermission(authz.user, 'payroll.configure')) {
    payment = await loadEmployeePayment(pool, member.teamMemberId);
  }

  return NextResponse.json({ ...member, schedule, payment });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  }

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
  const terminationDate = personalInfo.terminationDate ? String(personalInfo.terminationDate) : null;
  const roleId = Number(body?.roleId);

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
  // La contraseña es opcional al editar: vacía significa "conservar la actual".
  if (password && password.length < 8) {
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

    const { rows: existingRows } = await client.query(
      'SELECT tm.id AS "teamMemberId" FROM users u LEFT JOIN team_members tm ON tm.user_id = u.id WHERE u.id = $1',
      [userId]
    );

    if (existingRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Miembro del equipo no encontrado' }, { status: 404 });
    }

    const existingTeamMemberId: number | null = existingRows[0].teamMemberId;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        `UPDATE users
         SET name = $2, email = $3, phone = $4, role_id = $5, termination_date = $6, password_hash = $7
         WHERE id = $1`,
        [userId, name, email, phone || null, roleId, terminationDate, passwordHash]
      );
    } else {
      await client.query(
        `UPDATE users
         SET name = $2, email = $3, phone = $4, role_id = $5, termination_date = $6
         WHERE id = $1`,
        [userId, name, email, phone || null, roleId, terminationDate]
      );
    }

    let teamMemberId = existingTeamMemberId;

    if (isBookable) {
      if (teamMemberId) {
        await client.query(
          `UPDATE team_members
           SET employee_code = $2, job_title = $3, color_hex = $4,
               hire_date = $5, termination_date = $6, bio = $7
           WHERE id = $1`,
          [teamMemberId, employeeCode || null, jobTitle, colorHex || null, hireDate, terminationDate, bio || null]
        );
      } else {
        const { rows: tmRows } = await client.query(
          `INSERT INTO team_members (user_id, employee_code, job_title, color_hex, hire_date, termination_date, bio)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [userId, employeeCode || null, jobTitle, colorHex || null, hireDate, terminationDate, bio || null]
        );
        teamMemberId = tmRows[0].id;
      }

      // El horario se reemplaza completo: borrar y reinsertar es más simple y seguro
      // que reconciliar día por día, y las franjas caen por CASCADE.
      await client.query('DELETE FROM team_member_schedules WHERE team_member_id = $1', [teamMemberId]);

      for (const day of schedule) {
        const { rows: scheduleRows } = await client.query(
          `INSERT INTO team_member_schedules (team_member_id, day_of_week, enabled)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [teamMemberId, day.dayOfWeek, Boolean(day.enabled)]
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
    } else if (teamMemberId) {
      // Dejó de ser personal reservable. No se borra el perfil si ya tiene historial
      // de comisiones o citas — en ese caso se informa en vez de fallar con un error de FK.
      const { rows: usageRows } = await client.query(
        'SELECT COUNT(*)::int AS count FROM commission_entries WHERE team_member_id = $1',
        [teamMemberId]
      );

      if (usageRows[0].count > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Este miembro ya tiene comisiones registradas y no puede dejar de ser personal reservable' },
          { status: 409 }
        );
      }

      await client.query('DELETE FROM team_members WHERE id = $1', [teamMemberId]);
    }

    // Esquema de pago del empleado (config + comisiones). Solo quien puede configurar
    // nómina; extiende sin alterar el resto del guardado.
    if (isBookable && teamMemberId && body?.payment && viewer && hasPermission(viewer, 'payroll.configure')) {
      await saveEmployeePayment(client, teamMemberId, name, body.payment, viewer.id);
    }

    await client.query('COMMIT');

    return NextResponse.json({ userId, name, email, roleId, isBookable });
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

    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Error al actualizar el miembro del equipo' }, { status: 500 });
  } finally {
    client.release();
  }
}
