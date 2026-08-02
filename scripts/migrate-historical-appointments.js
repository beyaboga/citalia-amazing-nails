/**
 * Migración de citas históricas desde un Excel exportado del sistema anterior.
 *
 * Por cada fila crea la cita y, si corresponde, el pago/recibo (dispara el trigger
 * de comisiones existente) y, al final, cierra la nómina mes a mes para los
 * empleados con esquema de comisión. Ver el plan de esta migración para el detalle
 * de cada decisión.
 *
 * Uso:
 *   node scripts/migrate-historical-appointments.js --file "<ruta.xlsx>" --user-email correo@dominio.com [--execute]
 *
 * Sin --execute corre en modo simulación (dry-run): resuelve todo contra la BD con
 * solo SELECTs e imprime el resumen, sin escribir nada.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('pg');

// ---------------------------------------------------------------------------
// Config / mapeos (ver plan de migración)
// ---------------------------------------------------------------------------

const DEFAULT_FILE = 'C:\\Users\\USER\\Downloads\\report_appointment-list_2026-07-31 (1).xlsx';

const EMPLOYEE_MAP = {
  'Fernanda Alvarado': 'Luisa Fernanda Alvarador',
  'Bessy Bonilla': 'Bessy Yadira Bonilla Garcia',
};

const SERVICE_MAP = {
  'Esmaltado Regular': 'Esmaltado Regular Pies',
  'Limpiez de cutícula': 'Limpieza de cutícula',
  'Nivelacion + Manicura Rusa + Esmaltado': 'Nivelación + Manicura Rusa + Esmaltado',
};

// Completadas = hubo ingreso real -> cita completada + pago/recibo/comisión.
// Nueva = se reclasifica como completada (instrucción del negocio) pero SIN pago.
// Inasistencia / Cancelado = se conservan como historial, sin pago.
const STATUS_MAP = {
  Completadas: 'completed',
  Nueva: 'completed',
  Inasistencia: 'no_show',
  Cancelado: 'cancelled',
};

const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
  if (!match) throw new Error('DATABASE_URL no encontrada en .env');
  return match.slice('DATABASE_URL='.length).trim();
}

function parseArgs() {
  const args = process.argv.slice(2);
  // La app ya tiene citas reales cargadas desde el 01/05/2026 en adelante — esta
  // migración solo cubre lo anterior a esa fecha para no duplicar ingreso/comisión.
  const out = { file: DEFAULT_FILE, userEmail: null, execute: false, cutoffDate: '2026-05-01' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file') out.file = args[++i];
    else if (args[i] === '--user-email') out.userEmail = args[++i];
    else if (args[i] === '--execute') out.execute = true;
    else if (args[i] === '--cutoff') out.cutoffDate = args[++i];
  }
  if (!out.userEmail) throw new Error('Falta --user-email <correo del admin que ejecuta la migración>');
  return out;
}

/** "30/06/26 14:00:00" -> { dateStr: '2026-06-30', timeStr: '14:00:00', jsDate } */
function parseFileDateTime(raw) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(String(raw).trim());
  if (!m) throw new Error(`Fecha inválida: "${raw}"`);
  const [, dd, mm, yy, hh, mi, ss] = m;
  const year = 2000 + Number(yy);
  const dateStr = `${year}-${mm}-${dd}`;
  const timeStr = `${hh}:${mi}:${ss}`;
  const jsDate = new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
  return { dateStr, timeStr, jsDate };
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m, s] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:${String(s).padStart(2, '0')}`;
}

/** "14:00:00-15:30:00" -> { start: '14:00:00', end: '15:30:00' }; null si no se puede parsear. */
function parseTimeRange(raw) {
  const m = /^(\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2})$/.exec(String(raw ?? '').trim());
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

function lastDayOfMonth(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}

function monthlySalaryForPeriod(monthlySalary, payFrequency) {
  const value = payFrequency === 'BIWEEKLY' ? monthlySalary / 2 : monthlySalary;
  return round2(value);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { file, userEmail, execute, cutoffDate } = parseArgs();
  console.log(`Modo: ${execute ? 'EJECUCIÓN REAL (--execute)' : 'DRY-RUN (simulación, no escribe nada)'}`);
  console.log(`Archivo: ${file}`);
  console.log(`Corte: solo filas con fecha < ${cutoffDate} (la app ya tiene datos reales desde esa fecha)`);

  const wb = XLSX.readFile(file, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null, raw: false });

  // Parseo + orden ascendente por fecha (para que el alta de clientes nuevos use su
  // visita más antigua como fecha de registro).
  const rows = rawRows.map((r, idx) => {
    const { dateStr, timeStr, jsDate } = parseFileDateTime(r['Fecha programada']);
    return { rowNumber: idx + 2, raw: r, dateStr, timeStr, jsDate };
  });
  rows.sort((a, b) => a.jsDate - b.jsDate);

  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const { rows: userRows } = await client.query('SELECT id, name FROM users WHERE email = $1', [userEmail]);
    if (userRows.length === 0) throw new Error(`No existe un usuario con email ${userEmail}`);
    const executedByUserId = userRows[0].id;
    console.log(`Ejecutado por: ${userRows[0].name} (${userEmail})`);

    // --- Caches de resolución ---
    const { rows: customerRows } = await client.query('SELECT id, name FROM customers');
    const customerByName = new Map(customerRows.map((c) => [c.name.trim().toLowerCase(), c.id]));

    const { rows: teamRows } = await client.query(
      `SELECT tm.id AS "teamMemberId", u.id AS "userId", u.name,
              COALESCE(c.payment_scheme, 'FIXED') AS scheme,
              COALESCE(c.monthly_salary, 0)::float8 AS "monthlySalary",
              COALESCE(c.pay_frequency, 'MONTHLY') AS "payFrequency"
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         LEFT JOIN employee_payment_configs c ON c.team_member_id = tm.id`
    );
    const teamByName = new Map(teamRows.map((t) => [t.name.trim().toLowerCase(), t]));

    const { rows: serviceRows } = await client.query('SELECT id, name, duration_minutes AS "durationMinutes" FROM services');
    const serviceByName = new Map(serviceRows.map((s) => [s.name.trim().toLowerCase(), s]));

    const { rows: methodRows } = await client.query(`SELECT id FROM payment_methods WHERE name = 'Efectivo' LIMIT 1`);
    if (methodRows.length === 0) throw new Error('No existe el método de pago "Efectivo"');
    const cashMethodId = methodRows[0].id;

    // --- Contadores + errores ---
    const summary = {
      rowsProcessed: 0,
      rowsOutOfScope: 0,
      appointmentsCreated: 0,
      paymentsCreated: 0,
      commissionsCreated: 0,
      customersCreated: 0,
      rowsSkippedDuplicate: 0,
      rowsErrored: 0,
      errors: [],
    };
    const createdCustomerNames = new Set();
    const migratedCommissionEntryIds = [];

    for (const row of rows) {
      summary.rowsProcessed++;
      const r = row.raw;
      const ref = r['Ref. de la cita'];

      if (row.dateStr >= cutoffDate) {
        summary.rowsOutOfScope++;
        continue;
      }

      try {
        // --- Resolver empleado ---
        const fileEmployeeName = String(r['Miembro del equipo'] ?? '').trim();
        const mappedEmployeeName = EMPLOYEE_MAP[fileEmployeeName] ?? fileEmployeeName;
        const employee = teamByName.get(mappedEmployeeName.trim().toLowerCase());
        if (!employee) throw new Error(`Empleado no encontrado: "${fileEmployeeName}" (mapeado a "${mappedEmployeeName}")`);

        // --- Resolver servicio ---
        const fileServiceName = String(r['Servicio'] ?? '').trim();
        const mappedServiceName = SERVICE_MAP[fileServiceName] ?? fileServiceName;
        const service = serviceByName.get(mappedServiceName.trim().toLowerCase());
        if (!service) throw new Error(`Servicio no encontrado: "${fileServiceName}" (mapeado a "${mappedServiceName}")`);

        // --- Resolver estado ---
        const fileStatus = String(r['Estado'] ?? '').trim();
        const appointmentStatus = STATUS_MAP[fileStatus];
        if (!appointmentStatus) throw new Error(`Estado desconocido: "${fileStatus}"`);
        const generatesPayment = fileStatus === 'Completadas';

        // --- Resolver cliente (solo lectura de cache aquí; se crea DENTRO de la
        // transacción de la fila más abajo, para que un error posterior en la misma
        // fila también deshaga la creación del cliente) ---
        const fileCustomerName = String(r['Cliente'] ?? '').trim() || 'Sin cita';
        const customerKey = fileCustomerName.toLowerCase();
        let customerId = customerByName.get(customerKey) ?? null;
        const customerIsNew = customerId === null;
        if (customerIsNew && !createdCustomerNames.has(customerKey)) {
          createdCustomerNames.add(customerKey);
          summary.customersCreated++;
        }

        // --- Horario ---
        const range = parseTimeRange(r['Franja horaria de la cita']);
        const startTime = range?.start ?? row.timeStr;
        const endTime = range?.end ?? addMinutesToTime(startTime, service.durationMinutes || 30);

        // --- Precio ---
        const totalPrice = round2(Number(r['Ventas netas']) || 0);

        // --- Duplicado (un cliente nuevo nunca puede tener una cita previa) ---
        if (!customerIsNew) {
          const { rows: dupRows } = await client.query(
            `SELECT a.id FROM appointments a
               JOIN appointment_services aps ON aps.appointment_id = a.id
              WHERE a.customer_id = $1 AND a.technician_id = $2 AND a.appointment_date = $3
                AND a.appointment_time = $4 AND aps.service_id = $5
              LIMIT 1`,
            [customerId, employee.userId, row.dateStr, startTime, service.id]
          );
          if (dupRows.length > 0) {
            summary.rowsSkippedDuplicate++;
            continue;
          }
        }

        if (!execute) {
          // Dry-run: ya validamos que todo resuelve; contamos como si se fuera a crear.
          summary.appointmentsCreated++;
          if (generatesPayment) {
            summary.paymentsCreated++;
            summary.commissionsCreated++; // aproximado: 1 línea de servicio = hasta 1 comisión
          }
          continue;
        }

        // --- Ejecución real: transacción por fila ---
        await client.query('BEGIN');

        const createdAt = row.jsDate.toISOString();
        const notes = `Migrado — Ref. ${ref}`;

        if (customerIsNew) {
          const { rows: newCust } = await client.query(
            `INSERT INTO customers (name, registration_date) VALUES ($1, $2) RETURNING id`,
            [fileCustomerName, row.dateStr]
          );
          customerId = newCust[0].id;
          customerByName.set(customerKey, customerId);
        }

        const { rows: apptRows } = await client.query(
          `INSERT INTO appointments
             (customer_id, technician_id, appointment_date, appointment_time, end_time,
              status, total_duration_minutes, total_price, notes, created_at, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [customerId, employee.userId, row.dateStr, startTime, endTime,
           appointmentStatus, service.durationMinutes, totalPrice, notes, createdAt, executedByUserId]
        );
        const appointmentId = apptRows[0].id;

        const { rows: apptServiceRows } = await client.query(
          `INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, original_price, duration_at_booking)
           VALUES ($1,$2,$3,$3,$4) RETURNING id`,
          [appointmentId, service.id, totalPrice, service.durationMinutes]
        );
        const appointmentServiceId = apptServiceRows[0].id;

        if (generatesPayment && totalPrice > 0) {
          const { rows: payRows } = await client.query(
            `INSERT INTO payments
               (appointment_id, customer_id, subtotal, discount_amount, tip_amount,
                total_amount, paid_amount, payment_status, created_by, created_at)
             VALUES ($1,$2,$3,0,0,$3,$3,'PAID',$4,$5) RETURNING id`,
            [appointmentId, customerId, totalPrice, executedByUserId, createdAt]
          );
          const paymentId = payRows[0].id;
          summary.paymentsCreated++;

          await client.query(
            `INSERT INTO payment_details (payment_id, payment_method_id, amount) VALUES ($1,$2,$3)`,
            [paymentId, cashMethodId, totalPrice]
          );

          const { rows: numRows } = await client.query(
            `UPDATE receipt_numbering SET next_sequence = next_sequence + 1 WHERE id = 1
             RETURNING prefix, next_sequence - 1 AS sequence, padding`
          );
          const { prefix, sequence, padding } = numRows[0];
          const receiptNumber = `${prefix}${String(sequence).padStart(padding, '0')}`;
          await client.query(
            `INSERT INTO receipts (payment_id, receipt_number, prefix, sequence_number, issued_date, generated_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [paymentId, receiptNumber, prefix, sequence, createdAt, executedByUserId]
          );

          // Corrige la fecha del cálculo de comisión (el trigger usa now() por defecto)
          // para que el cierre de nómina agrupe por el mes real de la cita, y guarda el
          // id para que el cierre de nómina SOLO toque comisiones de esta migración
          // (nunca comisiones reales ya pendientes en el sistema).
          const { rows: commRows } = await client.query(
            `UPDATE commission_entries SET calculated_at = $1 WHERE appointment_service_id = $2 RETURNING id`,
            [createdAt, appointmentServiceId]
          );
          summary.commissionsCreated += commRows.length;
          commRows.forEach((c) => migratedCommissionEntryIds.push(c.id));
        }

        await client.query('COMMIT');
        summary.appointmentsCreated++;
      } catch (err) {
        if (execute) {
          try { await client.query('ROLLBACK'); } catch (_) { /* no-op */ }
        }
        summary.rowsErrored++;
        summary.errors.push({ row: row.rowNumber, ref, error: err.message });
      }
    }

    // --- Cierre de nómina mes a mes (solo ejecución real) ---
    // Se agrupa ÚNICAMENTE sobre las comisiones creadas por ESTA corrida
    // (migratedCommissionEntryIds) — nunca sobre "todo lo pendiente" del sistema,
    // para no tocar comisiones reales de la app en vivo que ya estuvieran pendientes.
    let payrollRecordsCreated = 0;
    if (execute && migratedCommissionEntryIds.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const { rows: pendingGroups } = await client.query(
        `SELECT ce.team_member_id AS "teamMemberId",
                EXTRACT(YEAR FROM ce.calculated_at)::int AS year,
                EXTRACT(MONTH FROM ce.calculated_at)::int AS month,
                SUM(ce.commission_amount)::float8 AS total,
                ARRAY_AGG(ce.id) AS ids
           FROM commission_entries ce
          WHERE ce.status = 'pending' AND ce.id = ANY($1)
          GROUP BY ce.team_member_id, year, month
          ORDER BY year, month`,
        [migratedCommissionEntryIds]
      );

      for (const g of pendingGroups) {
        if (g.year === currentYear && g.month === currentMonth) continue; // nunca el mes actual

        const employee = teamRows.find((t) => t.teamMemberId === g.teamMemberId);
        if (!employee) continue;

        const periodStart = `${g.year}-${String(g.month).padStart(2, '0')}-01`;
        const lastDay = lastDayOfMonth(g.year, g.month);
        const periodEnd = `${g.year}-${String(g.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const commissionTotal = round2(g.total);

        await client.query('BEGIN');
        try {
          const { rows: po } = await client.query(
            `INSERT INTO commission_payouts (team_member_id, period_start, period_end, total_amount, status, paid_at, created_by)
             VALUES ($1,$2,$3,$4,'paid',$5,$6) RETURNING id`,
            [g.teamMemberId, periodStart, periodEnd, commissionTotal, `${periodEnd}T23:59:59`, executedByUserId]
          );
          const payoutId = po[0].id;
          await client.query(`UPDATE commission_entries SET status = 'paid', payout_id = $1 WHERE id = ANY($2)`, [payoutId, g.ids]);

          const schemeHasSalary = employee.scheme === 'FIXED' || employee.scheme === 'FIXED_PLUS_COMMISSION';
          const salary = schemeHasSalary ? monthlySalaryForPeriod(employee.monthlySalary, employee.payFrequency) : 0;
          const net = round2(salary + commissionTotal);

          await client.query(
            `INSERT INTO payroll_payments
               (team_member_id, period_start, period_end, salary_amount, commission_amount,
                advance_deduction, net_amount, payment_method_id, commission_payout_id, notes,
                created_by, paid_at, include_commissions, is_custom_range, period_month, period_year)
             VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,'Migración histórica',$9,$10,true,false,$11,$12)`,
            [g.teamMemberId, periodStart, periodEnd, salary, commissionTotal, net, cashMethodId, payoutId,
             executedByUserId, `${periodEnd}T23:59:59`, g.month, g.year]
          );
          await client.query('COMMIT');
          payrollRecordsCreated++;
        } catch (err) {
          await client.query('ROLLBACK');
          summary.errors.push({ row: null, ref: `nómina ${g.year}-${g.month} (team_member ${g.teamMemberId})`, error: err.message });
        }
      }
    }

    // --- Auditoría ---
    if (execute) {
      await client.query(
        `INSERT INTO data_migrations
           (migration_key, source_file, executed_by, rows_processed, appointments_created,
            payments_created, commissions_created, payroll_records_created, customers_created,
            rows_skipped_duplicate, rows_errored, errors)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          `historical_appointments_${new Date().toISOString().slice(0, 10)}`,
          path.basename(file), executedByUserId, summary.rowsProcessed, summary.appointmentsCreated,
          summary.paymentsCreated, summary.commissionsCreated, payrollRecordsCreated, summary.customersCreated,
          summary.rowsSkippedDuplicate, summary.rowsErrored, JSON.stringify(summary.errors),
        ]
      );
    }

    // --- Resumen ---
    console.log('\n=== RESUMEN ===');
    console.log('Filas procesadas:      ', summary.rowsProcessed);
    console.log('Fuera de alcance (>= corte):', summary.rowsOutOfScope);
    console.log('Citas creadas:         ', summary.appointmentsCreated);
    console.log('Pagos creados:         ', summary.paymentsCreated);
    console.log('Comisiones creadas:    ', summary.commissionsCreated);
    console.log('Nóminas creadas:       ', payrollRecordsCreated, execute ? '' : '(se calculan solo en --execute)');
    console.log('Clientes nuevos:       ', summary.customersCreated);
    console.log('Duplicados omitidos:   ', summary.rowsSkippedDuplicate);
    console.log('Filas con error:       ', summary.rowsErrored);
    if (summary.errors.length > 0) {
      console.log('\nErrores:');
      summary.errors.forEach((e) => console.log(`  fila ${e.row ?? '-'} (${e.ref}): ${e.error}`));
    }
    if (!execute) {
      console.log('\nEsto fue un DRY-RUN — nada se escribió en la base de datos.');
      console.log('Si el resumen se ve correcto, vuelve a correr con --execute.');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
