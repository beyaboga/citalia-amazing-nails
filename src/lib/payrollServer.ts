/**
 * Lógica de servidor del esquema de pago de un empleado (config + comisiones).
 *
 * Compartida por la creación y la edición de miembros del equipo. Reutiliza el
 * sistema de comisiones existente ([[commissions]]): cada empleado tiene un
 * commission_scheme personal cuyas commission_rules son su "tabla de comisiones por
 * servicio". Cada cambio queda registrado en employee_payment_audit.
 */

import {
  schemeHasCommission,
  schemeHasSalary,
  salaryForPeriod,
  type PaymentScheme,
  type PayFrequency,
  type CalculationMode,
} from './payroll';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PayrollPreview {
  employee: { teamMemberId: number; name: string; scheme: PaymentScheme; payFrequency: PayFrequency };
  periodStart: string;
  periodEnd: string;
  salary: number;
  commissions: {
    total: number;
    included: boolean;
    items: { id: number; service: string; customer: string; amount: number; date: string }[];
  };
  advances: { total: number; items: { id: number; date: string; amount: number; method: string; notes: string | null }[] };
  gross: number;
  net: number;
}

/**
 * Calcula la planilla de un empleado para un período: sueldo (según frecuencia) +
 * comisiones pendientes (si `includeCommissions`) − adelantos pendientes = neto.
 * Las comisiones del período siempre se consultan y se devuelven (para el detalle
 * expandible en pantalla), pero sólo suman al bruto/neto si `includeCommissions` es
 * true. Fuente única para el preview y para el pago, para que la pantalla y la
 * ejecución siempre coincidan.
 */
export async function buildPayrollPreview(
  db: Queryable,
  teamMemberId: number,
  from: string,
  to: string,
  includeCommissions: boolean = true
): Promise<PayrollPreview | null> {
  const { rows: emp } = await db.query(
    `SELECT tm.id AS "teamMemberId", u.name,
            COALESCE(c.payment_scheme, 'FIXED') AS scheme,
            COALESCE(c.monthly_salary, 0)::float8 AS "monthlySalary",
            COALESCE(c.pay_frequency, 'MONTHLY') AS "payFrequency"
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN employee_payment_configs c ON c.team_member_id = tm.id
      WHERE tm.id = $1`,
    [teamMemberId]
  );
  if (emp.length === 0) return null;
  const e = emp[0];

  const salary = schemeHasSalary(e.scheme) ? salaryForPeriod(e.monthlySalary, e.payFrequency) : 0;

  const { rows: comms } = await db.query(
    `SELECT ce.id, COALESCE(s.name, 'Comisión escalonada') AS service,
            COALESCE(c_line.name, c_total.name) AS customer,
            ce.commission_amount::float8 AS amount,
            to_char(ce.calculated_at, 'YYYY-MM-DD') AS date
       FROM commission_entries ce
       LEFT JOIN appointment_services aps ON aps.id = ce.appointment_service_id
       LEFT JOIN services s ON s.id = ce.service_id
       LEFT JOIN appointments a_line ON a_line.id = aps.appointment_id
       LEFT JOIN customers c_line ON c_line.id = a_line.customer_id
       LEFT JOIN appointments a_total ON a_total.id = ce.appointment_id
       LEFT JOIN customers c_total ON c_total.id = a_total.customer_id
      WHERE ce.team_member_id = $1 AND ce.status IN ('pending', 'approved')
        AND ce.calculated_at::date BETWEEN $2 AND $3
      ORDER BY ce.calculated_at`,
    [teamMemberId, from, to]
  );
  const commTotal = round2(comms.reduce((s, r) => s + r.amount, 0));
  const effectiveCommission = includeCommissions ? commTotal : 0;

  const { rows: advs } = await db.query(
    `SELECT ea.id, to_char(ea.advance_date, 'YYYY-MM-DD') AS date, ea.amount::float8 AS amount,
            pm.name AS method, ea.notes
       FROM employee_advances ea
       JOIN payment_methods pm ON pm.id = ea.payment_method_id
      WHERE ea.team_member_id = $1 AND ea.status = 'OUTSTANDING'
      ORDER BY ea.advance_date`,
    [teamMemberId]
  );
  const advTotal = round2(advs.reduce((s, r) => s + r.amount, 0));

  const gross = round2(salary + effectiveCommission);
  const net = Math.max(0, round2(gross - advTotal));

  return {
    employee: { teamMemberId: e.teamMemberId, name: e.name, scheme: e.scheme, payFrequency: e.payFrequency },
    periodStart: from,
    periodEnd: to,
    salary,
    commissions: { total: commTotal, included: includeCommissions, items: comms },
    advances: { total: advTotal, items: advs },
    gross,
    net,
  };
}

// pg Pool y PoolClient comparten esta forma.
interface Queryable {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface CommissionRuleInput {
  serviceId: number;
  commissionType: 'percentage' | 'fixed_amount';
  value: number;
  calculationBase: 'GROSS' | 'NET';
}

export interface CommissionTierInput {
  minAmount: number;
  maxAmount: number | null;
  commissionAmount: number;
}

export interface EmployeePaymentInput {
  scheme: PaymentScheme;
  monthlySalary: number;
  payFrequency: PayFrequency;
  calculationMode: CalculationMode;
  rules: CommissionRuleInput[];
  tiers: CommissionTierInput[];
}

export interface EmployeePaymentData {
  scheme: PaymentScheme;
  monthlySalary: number;
  payFrequency: PayFrequency;
  calculationMode: CalculationMode;
  rules: CommissionRuleInput[];
  tiers: CommissionTierInput[];
}

const VALID_SCHEMES: PaymentScheme[] = ['FIXED', 'FIXED_PLUS_COMMISSION', 'COMMISSION_ONLY'];

/** Lee la configuración de pago y las reglas de comisión (por servicio o por rango) de un empleado. */
export async function loadEmployeePayment(db: Queryable, teamMemberId: number): Promise<EmployeePaymentData> {
  const { rows: cfgRows } = await db.query(
    `SELECT payment_scheme AS "scheme", monthly_salary::float8 AS "monthlySalary",
            pay_frequency AS "payFrequency"
       FROM employee_payment_configs WHERE team_member_id = $1`,
    [teamMemberId]
  );

  const { rows: schemeRows } = await db.query(
    `SELECT cs.calculation_mode AS "calculationMode"
       FROM team_members tm
       JOIN commission_schemes cs ON cs.id = tm.commission_scheme_id
      WHERE tm.id = $1`,
    [teamMemberId]
  );

  const { rows: ruleRows } = await db.query(
    `SELECT r.service_id AS "serviceId", t.code AS "commissionType",
            r.value::float8 AS value, r.calculation_base AS "calculationBase"
       FROM team_members tm
       JOIN commission_rules r ON r.scheme_id = tm.commission_scheme_id
       JOIN commission_types t ON t.id = r.commission_type_id
      WHERE tm.id = $1 AND r.service_id IS NOT NULL
      ORDER BY r.service_id`,
    [teamMemberId]
  );

  const { rows: tierRows } = await db.query(
    `SELECT ct.min_amount::float8 AS "minAmount", ct.max_amount::float8 AS "maxAmount",
            ct.commission_amount::float8 AS "commissionAmount"
       FROM team_members tm
       JOIN commission_tiers ct ON ct.scheme_id = tm.commission_scheme_id
      WHERE tm.id = $1 AND ct.is_active
      ORDER BY ct.min_amount`,
    [teamMemberId]
  );

  return {
    scheme: (cfgRows[0]?.scheme as PaymentScheme) ?? 'FIXED',
    monthlySalary: cfgRows[0]?.monthlySalary ?? 0,
    payFrequency: (cfgRows[0]?.payFrequency as PayFrequency) ?? 'MONTHLY',
    calculationMode: (schemeRows[0]?.calculationMode as CalculationMode) ?? 'PER_SERVICE',
    rules: ruleRows,
    tiers: tierRows,
  };
}

/**
 * Devuelve el id del esquema de comisión PERSONAL del empleado, creándolo si no
 * existe. Si el esquema actual lo comparten varios técnicos, lo bifurca para no
 * pisar la configuración de otros.
 */
async function ensurePersonalScheme(db: Queryable, teamMemberId: number, employeeName: string): Promise<number> {
  const { rows } = await db.query('SELECT commission_scheme_id AS "schemeId" FROM team_members WHERE id = $1', [
    teamMemberId,
  ]);
  const schemeId: number | null = rows[0]?.schemeId ?? null;

  if (schemeId) {
    const { rows: usage } = await db.query(
      'SELECT COUNT(*)::int AS count FROM team_members WHERE commission_scheme_id = $1',
      [schemeId]
    );
    if (usage[0].count <= 1) return schemeId; // esquema propio, reutilizable
  }

  const { rows: created } = await db.query(
    'INSERT INTO commission_schemes (name, description) VALUES ($1, $2) RETURNING id',
    [`Esquema de ${employeeName}`.slice(0, 100), 'Esquema personal generado desde el perfil del empleado']
  );
  const newSchemeId = created[0].id;
  await db.query('UPDATE team_members SET commission_scheme_id = $1 WHERE id = $2', [newSchemeId, teamMemberId]);
  return newSchemeId;
}

/** Reemplaza las reglas por servicio del esquema con las provistas. */
async function replaceServiceRules(db: Queryable, schemeId: number, rules: CommissionRuleInput[]): Promise<void> {
  // Solo se gestionan reglas por servicio desde el perfil; se conservan intactas
  // las reglas por categoría o por defecto si algún día se crean por otra vía.
  await db.query('DELETE FROM commission_rules WHERE scheme_id = $1 AND service_id IS NOT NULL', [schemeId]);

  for (const rule of rules) {
    if (!Number.isInteger(rule.serviceId)) continue;
    const type = rule.commissionType === 'fixed_amount' ? 'fixed_amount' : 'percentage';
    const base = rule.calculationBase === 'NET' ? 'NET' : 'GROSS';
    let value = Number(rule.value);
    if (!Number.isFinite(value) || value < 0) value = 0;
    if (type === 'percentage' && value > 100) value = 100;

    await db.query(
      `INSERT INTO commission_rules (scheme_id, service_id, commission_type_id, value, calculation_base)
       VALUES ($1, $2, (SELECT id FROM commission_types WHERE code = $3), $4, $5)`,
      [schemeId, rule.serviceId, type, value, base]
    );
  }
}

/**
 * Reemplaza los rangos de comisión escalonada del esquema con los provistos.
 * Si los rangos se traslapan, la BD rechaza el insert (EXCLUDE en commission_tiers)
 * — se relanza un error legible en vez del mensaje crudo de Postgres.
 */
async function replaceTiers(db: Queryable, schemeId: number, tiers: CommissionTierInput[]): Promise<void> {
  await db.query('DELETE FROM commission_tiers WHERE scheme_id = $1', [schemeId]);

  for (const tier of tiers) {
    let minAmount = Number(tier.minAmount);
    if (!Number.isFinite(minAmount) || minAmount < 0) minAmount = 0;
    const maxAmount = tier.maxAmount === null || tier.maxAmount === undefined ? null : Number(tier.maxAmount);
    let commissionAmount = Number(tier.commissionAmount);
    if (!Number.isFinite(commissionAmount) || commissionAmount < 0) commissionAmount = 0;
    if (maxAmount !== null && !(maxAmount > minAmount)) continue; // rango inválido, se omite

    try {
      await db.query(
        `INSERT INTO commission_tiers (scheme_id, min_amount, max_amount, commission_amount)
         VALUES ($1, $2, $3, $4)`,
        [schemeId, minAmount, maxAmount, commissionAmount]
      );
    } catch (error: any) {
      if (error?.code === '23P01') { // exclusion_violation
        throw new Error('Los rangos de comisión no pueden traslaparse entre sí.');
      }
      throw error;
    }
  }
}

/**
 * Guarda la configuración de pago de un empleado (upsert) y, si el esquema incluye
 * comisión, sus reglas por servicio. Registra el cambio en la bitácora de auditoría.
 * Debe llamarse dentro de una transacción con un `teamMemberId` ya existente.
 */
export async function saveEmployeePayment(
  db: Queryable,
  teamMemberId: number,
  employeeName: string,
  payment: EmployeePaymentInput,
  changedBy: number
): Promise<void> {
  const scheme: PaymentScheme = VALID_SCHEMES.includes(payment?.scheme) ? payment.scheme : 'FIXED';
  let monthlySalary = Number(payment?.monthlySalary);
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) monthlySalary = 0;
  const payFrequency: PayFrequency = payment?.payFrequency === 'BIWEEKLY' ? 'BIWEEKLY' : 'MONTHLY';
  const calculationMode: CalculationMode = payment?.calculationMode === 'TIERED_TOTAL' ? 'TIERED_TOTAL' : 'PER_SERVICE';
  const rules = Array.isArray(payment?.rules) ? payment.rules : [];
  const tiers = Array.isArray(payment?.tiers) ? payment.tiers : [];

  const before = await loadEmployeePayment(db, teamMemberId);

  await db.query(
    `INSERT INTO employee_payment_configs (team_member_id, payment_scheme, monthly_salary, pay_frequency)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (team_member_id)
     DO UPDATE SET payment_scheme = EXCLUDED.payment_scheme,
                   monthly_salary = EXCLUDED.monthly_salary,
                   pay_frequency = EXCLUDED.pay_frequency`,
    [teamMemberId, scheme, monthlySalary, payFrequency]
  );

  if (schemeHasCommission(scheme)) {
    const schemeId = await ensurePersonalScheme(db, teamMemberId, employeeName);
    await db.query('UPDATE commission_schemes SET calculation_mode = $1 WHERE id = $2', [calculationMode, schemeId]);
    if (calculationMode === 'TIERED_TOTAL') {
      await db.query('DELETE FROM commission_rules WHERE scheme_id = $1 AND service_id IS NOT NULL', [schemeId]);
      await replaceTiers(db, schemeId, tiers);
    } else {
      await db.query('DELETE FROM commission_tiers WHERE scheme_id = $1', [schemeId]);
      await replaceServiceRules(db, schemeId, rules);
    }
  } else {
    // Sueldo fijo puro: sin comisiones. Se limpian reglas y rangos si los hubiera.
    const { rows } = await db.query('SELECT commission_scheme_id AS "schemeId" FROM team_members WHERE id = $1', [
      teamMemberId,
    ]);
    if (rows[0]?.schemeId) {
      await db.query('DELETE FROM commission_rules WHERE scheme_id = $1 AND service_id IS NOT NULL', [rows[0].schemeId]);
      await db.query('DELETE FROM commission_tiers WHERE scheme_id = $1', [rows[0].schemeId]);
    }
  }

  const after = await loadEmployeePayment(db, teamMemberId);
  await db.query(
    `INSERT INTO employee_payment_audit (team_member_id, changed_by, change_type, before, after)
     VALUES ($1, $2, 'payment_config', $3, $4)`,
    [teamMemberId, changedBy, JSON.stringify(before), JSON.stringify(after)]
  );
}
