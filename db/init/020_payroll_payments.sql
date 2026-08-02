-- =========================================================
-- Pago a técnicos: frecuencia, adelantos y planilla
-- =========================================================
-- Extiende el módulo de nómina para PAGAR a los empleados (no solo comisiones):
-- frecuencia quincenal/mensual, adelantos que se descuentan, y una planilla que
-- liquida el período (sueldo + comisiones − adelantos = neto).
--
-- El pago y los adelantos son dinero que sale de caja: se suman a la vista
-- cash_movements como salidas (OUT) para que el saldo por método sea real.
-- No se toca el módulo de pagos de citas.

-- 1. Frecuencia de pago por empleado (se DEFINE en el perfil).
ALTER TABLE employee_payment_configs
  ADD COLUMN pay_frequency VARCHAR(10) NOT NULL DEFAULT 'MONTHLY'
    CHECK (pay_frequency IN ('BIWEEKLY', 'MONTHLY'));

-- 2. Adelantos (dinero entregado por anticipado, se descuenta en la planilla).
CREATE TABLE employee_advances (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL,
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  status VARCHAR(12) NOT NULL DEFAULT 'OUTSTANDING'
    CHECK (status IN ('OUTSTANDING', 'SETTLED')),
  settled_payroll_id INTEGER,  -- FK a payroll_payments (se agrega abajo)
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_advances_member ON employee_advances(team_member_id);
CREATE INDEX idx_employee_advances_status ON employee_advances(status);

-- 3. Planilla ejecutada (un pago por empleado y período).
CREATE TABLE payroll_payments (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  salary_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (salary_amount >= 0),
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  advance_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (advance_deduction >= 0),
  net_amount NUMERIC(10, 2) NOT NULL CHECK (net_amount >= 0),
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  commission_payout_id INTEGER REFERENCES commission_payouts(id) ON DELETE SET NULL,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_payroll_payments_member ON payroll_payments(team_member_id);

ALTER TABLE employee_advances
  ADD CONSTRAINT fk_advances_payroll
  FOREIGN KEY (settled_payroll_id) REFERENCES payroll_payments(id) ON DELETE SET NULL;

-- 4. Vista cash_movements: agregar salidas de planilla y adelantos.
-- Total que sale por un período = adelantos (pagados antes) + neto de planilla,
-- que equivale al bruto (sueldo + comisiones). No hay doble conteo de caja.
CREATE OR REPLACE VIEW cash_movements AS
  SELECT 'IN'::text  AS direction, pd.payment_method_id, pd.amount,
         p.created_at::date AS movement_date, 'payment'::text AS source_type, p.id AS source_id
  FROM payment_details pd
  JOIN payments p ON p.id = pd.payment_id
  WHERE p.voided_at IS NULL
  UNION ALL
  SELECT 'OUT'::text, e.payment_method_id, e.amount,
         e.expense_date, 'expense'::text, e.id
  FROM expenses e
  WHERE e.status = 'PAID'
  UNION ALL
  SELECT 'OUT'::text, pp.payment_method_id, pp.net_amount,
         pp.paid_at::date, 'payroll'::text, pp.id
  FROM payroll_payments pp
  UNION ALL
  SELECT 'OUT'::text, ea.payment_method_id, ea.amount,
         ea.advance_date, 'advance'::text, ea.id
  FROM employee_advances ea;

-- 5. Permiso para ejecutar la planilla y registrar adelantos (solo admin).
INSERT INTO permissions (key, category, description) VALUES
  ('payroll.pay', 'finanzas', 'Ejecutar la planilla (pago a empleados) y registrar adelantos');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin' AND p.key = 'payroll.pay';
