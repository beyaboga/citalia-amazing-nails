-- =========================================================
-- Esquema de pago de empleados y comisiones (extensión)
-- =========================================================
-- Extiende el sistema de comisiones ya existente (008_commissions.sql) en vez de
-- duplicarlo. Añade: esquema de pago + sueldo fijo por empleado, mantenimiento de
-- impuestos (ISV), base de cálculo GROSS/NET por regla, generación AUTOMÁTICA de
-- comisiones al pagar una cita (vía triggers, sin tocar el módulo de pagos) y una
-- bitácora de auditoría.
--
-- Todo es aditivo (CREATE / ALTER ADD). No reescribe ninguna lógica existente.
-- Cada empleado tiene su propio commission_scheme (team_members.commission_scheme_id);
-- la "tabla de comisiones por servicio" del perfil son las commission_rules de ese
-- esquema. La comisión se atribuye al técnico de la cita (appointments.technician_id).

-- =========================================================
-- 1. employee_payment_configs — esquema de pago por empleado (1:1)
-- =========================================================
CREATE TABLE employee_payment_configs (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL UNIQUE REFERENCES team_members(id) ON DELETE CASCADE,
  -- FIXED = solo sueldo (no genera comisiones)
  -- FIXED_PLUS_COMMISSION = sueldo + comisiones por servicio
  -- COMMISSION_ONLY = sin sueldo base, solo comisiones
  payment_scheme VARCHAR(30) NOT NULL DEFAULT 'FIXED'
    CHECK (payment_scheme IN ('FIXED', 'FIXED_PLUS_COMMISSION', 'COMMISSION_ONLY')),
  monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_employee_payment_configs_updated_at
  BEFORE UPDATE ON employee_payment_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 2. tax_configurations — mantenimiento de impuestos (ISV, IVA, …)
-- =========================================================
-- No se asume un porcentaje fijo en el código: el cálculo usa el impuesto ACTIVO.
CREATE TABLE tax_configurations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A lo sumo un impuesto activo a la vez.
CREATE UNIQUE INDEX idx_tax_configurations_one_active
  ON tax_configurations ((is_active)) WHERE is_active;

INSERT INTO tax_configurations (name, percentage, is_active) VALUES ('ISV', 15, true);

-- =========================================================
-- 3. commission_rules — base de cálculo por regla (GROSS / NET)
-- =========================================================
-- GROSS = sobre el precio total; NET = sobre el precio sin impuesto.
-- DEFAULT 'GROSS' mantiene intacto el comportamiento del /resolve existente.
ALTER TABLE commission_rules
  ADD COLUMN calculation_base VARCHAR(5) NOT NULL DEFAULT 'GROSS'
    CHECK (calculation_base IN ('GROSS', 'NET'));

-- =========================================================
-- 4. commission_entries — snapshot fiscal de cada comisión ganada
-- =========================================================
-- base_amount, rate_value, commission_amount, status y payout_id ya existen (008).
-- Se agrega el detalle fiscal para trazabilidad y reportes.
ALTER TABLE commission_entries
  ADD COLUMN service_price NUMERIC(10, 2),         -- precio realmente cobrado (price_at_booking)
  ADD COLUMN calculation_base VARCHAR(5) CHECK (calculation_base IN ('GROSS', 'NET')),
  ADD COLUMN tax_configuration_id INTEGER REFERENCES tax_configurations(id) ON DELETE SET NULL,
  ADD COLUMN tax_percentage NUMERIC(5, 2),
  ADD COLUMN tax_amount NUMERIC(10, 2);

-- =========================================================
-- 5. Generación automática de comisiones al pagar la cita
-- =========================================================
-- El cálculo vive en una función de base porque debe dispararse desde el pago sin
-- tocar el código del módulo de pagos. Hoy resuelve los tipos 'percentage' y
-- 'fixed_amount'; un tipo futuro (escalonado, meta) se añade extendiendo esta función.

CREATE FUNCTION generate_commissions_for_payment(p_payment_id INTEGER)
RETURNS void AS $$
DECLARE
  v_appointment_id     INTEGER;
  v_status             VARCHAR(10);
  v_voided             TIMESTAMPTZ;
  v_technician_user_id INTEGER;
  v_team_member_id     INTEGER;
  v_scheme_id          INTEGER;
  v_payment_scheme     VARCHAR(30);
  v_tax_id             INTEGER;
  v_isv                NUMERIC(5, 2);
  aps                  RECORD;
  v_rule               RECORD;
  v_base               NUMERIC(10, 2);
  v_tax_amount         NUMERIC(10, 2);
  v_commission         NUMERIC(10, 2);
BEGIN
  SELECT appointment_id, payment_status, voided_at
    INTO v_appointment_id, v_status, v_voided
    FROM payments WHERE id = p_payment_id;

  -- Solo cuando el pago está confirmado (completo) y no anulado.
  IF v_status IS DISTINCT FROM 'PAID' OR v_voided IS NOT NULL THEN
    RETURN;
  END IF;

  -- Técnico de la cita → miembro del equipo + su esquema de comisión.
  SELECT technician_id INTO v_technician_user_id
    FROM appointments WHERE id = v_appointment_id;
  IF v_technician_user_id IS NULL THEN RETURN; END IF;

  SELECT tm.id, tm.commission_scheme_id
    INTO v_team_member_id, v_scheme_id
    FROM team_members tm WHERE tm.user_id = v_technician_user_id;
  IF v_team_member_id IS NULL OR v_scheme_id IS NULL THEN RETURN; END IF;

  -- Sueldo fijo puro: no se generan comisiones.
  SELECT payment_scheme INTO v_payment_scheme
    FROM employee_payment_configs WHERE team_member_id = v_team_member_id;
  IF v_payment_scheme = 'FIXED' THEN RETURN; END IF;

  -- Impuesto activo (para la base NET).
  SELECT id, percentage INTO v_tax_id, v_isv
    FROM tax_configurations WHERE is_active LIMIT 1;
  v_isv := COALESCE(v_isv, 0);

  FOR aps IN
    SELECT id, service_id, price_at_booking
      FROM appointment_services WHERE appointment_id = v_appointment_id
  LOOP
    -- Resolver la regla aplicable: servicio exacto → categoría → regla por defecto.
    SELECT r.id, r.value, r.calculation_base, t.code AS type_code
      INTO v_rule
      FROM commission_rules r
      JOIN commission_types t ON t.id = r.commission_type_id
      WHERE r.scheme_id = v_scheme_id
        AND (
          r.service_id = aps.service_id
          OR r.category_id = (SELECT category_id FROM services WHERE id = aps.service_id)
          OR (r.service_id IS NULL AND r.category_id IS NULL)
        )
      ORDER BY (r.service_id IS NOT NULL) DESC, (r.category_id IS NOT NULL) DESC
      LIMIT 1;

    IF v_rule.id IS NULL THEN CONTINUE; END IF;  -- sin regla → sin comisión para esta línea

    -- Base del cálculo según la regla.
    IF v_rule.calculation_base = 'NET' THEN
      v_base := ROUND(aps.price_at_booking / (1 + v_isv / 100.0), 2);
      v_tax_amount := ROUND(aps.price_at_booking - v_base, 2);
    ELSE
      v_base := aps.price_at_booking;
      v_tax_amount := 0;
    END IF;

    -- Monto según el tipo de comisión.
    IF v_rule.type_code = 'percentage' THEN
      v_commission := ROUND(v_base * v_rule.value / 100.0, 2);
    ELSE
      v_commission := v_rule.value;  -- monto fijo: no depende del precio
    END IF;

    INSERT INTO commission_entries (
      appointment_service_id, team_member_id, service_id, commission_scheme_id,
      commission_rule_id, commission_type_code, base_amount, rate_value, commission_amount,
      status, service_price, calculation_base, tax_configuration_id, tax_percentage, tax_amount
    ) VALUES (
      aps.id, v_team_member_id, aps.service_id, v_scheme_id,
      v_rule.id, v_rule.type_code, v_base, v_rule.value, v_commission,
      'pending', aps.price_at_booking, v_rule.calculation_base, v_tax_id, v_isv, v_tax_amount
    )
    ON CONFLICT (appointment_service_id) DO NOTHING;  -- idempotente
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Al anular un pago: las comisiones aún no liquidadas se marcan como anuladas
-- (nunca se borran; las ya pagadas en un payout quedan intactas).
CREATE FUNCTION void_commissions_for_payment(p_payment_id INTEGER)
RETURNS void AS $$
DECLARE
  v_appointment_id INTEGER;
BEGIN
  SELECT appointment_id INTO v_appointment_id FROM payments WHERE id = p_payment_id;
  IF v_appointment_id IS NULL THEN RETURN; END IF;

  UPDATE commission_entries
     SET status = 'voided'
   WHERE status IN ('pending', 'approved')
     AND appointment_service_id IN (
       SELECT id FROM appointment_services WHERE appointment_id = v_appointment_id
     );
END;
$$ LANGUAGE plpgsql;

-- Disparador único sobre payments: genera al quedar PAID, anula al marcarse voided.
CREATE FUNCTION trg_payments_commissions() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'PAID' AND NEW.voided_at IS NULL THEN
      PERFORM generate_commissions_for_payment(NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
      PERFORM void_commissions_for_payment(NEW.id);
    ELSIF NEW.payment_status = 'PAID' AND NEW.voided_at IS NULL
          AND OLD.payment_status IS DISTINCT FROM 'PAID' THEN
      PERFORM generate_commissions_for_payment(NEW.id);
    END IF;
  END IF;
  RETURN NULL;  -- trigger AFTER
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_generate_commissions
  AFTER INSERT OR UPDATE OF payment_status, voided_at ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payments_commissions();

-- =========================================================
-- 6. employee_payment_audit — bitácora de cambios al esquema/comisiones
-- =========================================================
CREATE TABLE employee_payment_audit (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  change_type VARCHAR(40) NOT NULL,  -- 'payment_config' | 'commission_rules'
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_payment_audit_member ON employee_payment_audit(team_member_id);

-- =========================================================
-- 7. Permisos del módulo
-- =========================================================
INSERT INTO permissions (key, category, description) VALUES
  ('payroll.configure', 'equipo', 'Configurar esquema de pago, sueldo y comisiones de empleados, e impuestos'),
  ('commissions.pay',   'pagos',  'Pagar comisiones a los empleados');

-- Admin recibe ambos (el seed original de admin fue único, no se auto-agregan).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.key IN ('payroll.configure', 'commissions.pay');
