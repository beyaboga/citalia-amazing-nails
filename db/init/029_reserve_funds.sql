-- =========================================================
-- Módulo: Fondos Reservados (Bolsillos Virtuales)
-- =========================================================
-- Capa contable, no mueve dinero real: reserva automáticamente parte de cada venta
-- en "fondos" (costos de servicio, comisiones, y fondos personalizados definidos
-- por el admin), organizados por período mensual. Ver docs de planeación del
-- módulo (memoria del agente) para el diseño completo.
--
-- No toca payments, appointments ni cash_movements — es 100% aditivo, mismo
-- criterio que 024_cash_deliveries.sql.

-- =========================================================
-- 1. services.cost — costo real del servicio (materiales/insumos)
-- =========================================================
ALTER TABLE services
  ADD COLUMN cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0);

-- =========================================================
-- 2. appointment_services.cost_at_booking — snapshot del costo, congelado
-- =========================================================
-- A diferencia de price_at_booking (que insertan a mano dos rutas de API), este se
-- congela solo con un trigger BEFORE INSERT: así ningún call site nuevo puede
-- olvidarse de setearlo.
ALTER TABLE appointment_services
  ADD COLUMN cost_at_booking NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE FUNCTION snapshot_appointment_service_cost() RETURNS trigger AS $$
BEGIN
  SELECT cost INTO NEW.cost_at_booking FROM services WHERE id = NEW.service_id;
  NEW.cost_at_booking := COALESCE(NEW.cost_at_booking, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_services_cost_snapshot
  BEFORE INSERT ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION snapshot_appointment_service_cost();

-- =========================================================
-- 3. financial_periods — un período por mes, independiente entre sí
-- =========================================================
CREATE TABLE financial_periods (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL CHECK (year >= 2000),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (year, month)
);

CREATE INDEX idx_financial_periods_status ON financial_periods(status);

-- =========================================================
-- 4. reserve_funds — catálogo de fondos (2 de sistema + los que cree el admin)
-- =========================================================
CREATE TABLE reserve_funds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('SERVICE_COST', 'COMMISSION', 'CUSTOM')),
  reservation_type VARCHAR(20) NOT NULL
    CHECK (reservation_type IN ('FIXED_AMOUNT', 'PERCENTAGE', 'SERVICE_COST', 'COMMISSION_BASED', 'MANUAL_ONLY')),
  -- Solo aplica (y es obligatorio) para FIXED_AMOUNT/PERCENTAGE; el resto lo calcula
  -- el sistema a partir de datos reales, no de un valor configurado.
  reservation_value NUMERIC(10, 2) CHECK (reservation_value IS NULL OR reservation_value >= 0),
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (reservation_type IN ('FIXED_AMOUNT', 'PERCENTAGE') AND reservation_value IS NOT NULL)
    OR (reservation_type IN ('SERVICE_COST', 'COMMISSION_BASED', 'MANUAL_ONLY') AND reservation_value IS NULL)
  )
);

CREATE INDEX idx_reserve_funds_active ON reserve_funds(is_active);

CREATE TRIGGER trg_reserve_funds_updated_at
  BEFORE UPDATE ON reserve_funds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Protección a nivel de base: los 2 fondos de sistema nunca se borran ni cambian de
-- tipo, aunque alguien se salte la API. Mismo criterio que
-- prevent_system_payment_method_delete (015_payments_module.sql).
CREATE FUNCTION prevent_system_fund_delete() RETURNS trigger AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'El fondo "%" es del sistema y no se puede eliminar', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserve_funds_no_delete_system
  BEFORE DELETE ON reserve_funds
  FOR EACH ROW EXECUTE FUNCTION prevent_system_fund_delete();

CREATE FUNCTION prevent_system_fund_retype() RETURNS trigger AS $$
BEGIN
  IF OLD.is_system AND (NEW.kind <> OLD.kind OR NEW.reservation_type <> OLD.reservation_type OR NOT NEW.is_system) THEN
    RAISE EXCEPTION 'El fondo "%" es del sistema y no se puede reconfigurar', OLD.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserve_funds_no_retype_system
  BEFORE UPDATE ON reserve_funds
  FOR EACH ROW EXECUTE FUNCTION prevent_system_fund_retype();

INSERT INTO reserve_funds (name, kind, reservation_type, is_system, display_order) VALUES
  ('Fondo de Costos de Servicios', 'SERVICE_COST', 'SERVICE_COST', true, 1),
  ('Fondo de Comisiones',          'COMMISSION',   'COMMISSION_BASED', true, 2);

-- =========================================================
-- 5. fund_movements — historial único (automático + manual), nunca se borra
-- =========================================================
CREATE TABLE fund_movements (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER NOT NULL REFERENCES reserve_funds(id) ON DELETE RESTRICT,
  financial_period_id INTEGER NOT NULL REFERENCES financial_periods(id) ON DELETE RESTRICT,
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  movement_type VARCHAR(30) NOT NULL
    CHECK (movement_type IN (
      'AUTO_SERVICE_COST', 'AUTO_COMMISSION', 'AUTO_FIXED', 'AUTO_PERCENTAGE',
      'COMMISSION_PAYOUT', 'MANUAL_CONTRIBUTION', 'MANUAL_WITHDRAWAL'
    )),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('payment', 'commission_payout', 'manual')),
  payment_id INTEGER REFERENCES payments(id) ON DELETE RESTRICT,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
  team_member_id INTEGER REFERENCES team_members(id) ON DELETE RESTRICT,
  commission_payout_id INTEGER REFERENCES commission_payouts(id) ON DELETE RESTRICT,
  concept VARCHAR(200) NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  void_reason TEXT
);

CREATE INDEX idx_fund_movements_fund ON fund_movements(fund_id);
CREATE INDEX idx_fund_movements_period ON fund_movements(financial_period_id);
CREATE INDEX idx_fund_movements_payment ON fund_movements(payment_id);
CREATE INDEX idx_fund_movements_created_at ON fund_movements(created_at);

-- Defensa a nivel de base contra reservas duplicadas por el mismo pago (idempotencia
-- de reserve_funds_for_payment), aunque el guard de la función ya lo evita en la
-- práctica — mismo espíritu que appointments_no_overlap.
CREATE UNIQUE INDEX uq_fund_movements_payment_fund_type
  ON fund_movements (payment_id, fund_id, movement_type)
  WHERE source_type = 'payment' AND voided_at IS NULL;

-- =========================================================
-- 6. Períodos: resolver/crear + cierre perezoso
-- =========================================================
CREATE FUNCTION get_or_create_financial_period(p_date DATE) RETURNS INTEGER AS $$
DECLARE
  v_year  INTEGER := EXTRACT(YEAR FROM p_date)::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM p_date)::INTEGER;
  v_cur_year  INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_cur_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_id INTEGER;
BEGIN
  SELECT id INTO v_id FROM financial_periods WHERE year = v_year AND month = v_month;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Si el mes ya pasó, se crea directamente cerrado (nunca hubo oportunidad de
  -- tocarlo mientras estaba "abierto").
  IF (v_year, v_month) < (v_cur_year, v_cur_month) THEN
    INSERT INTO financial_periods (year, month, status, closed_at)
      VALUES (v_year, v_month, 'CLOSED', now())
      ON CONFLICT (year, month) DO NOTHING
      RETURNING id INTO v_id;
  ELSE
    INSERT INTO financial_periods (year, month, status)
      VALUES (v_year, v_month, 'OPEN')
      ON CONFLICT (year, month) DO NOTHING
      RETURNING id INTO v_id;
  END IF;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM financial_periods WHERE year = v_year AND month = v_month;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Cierre perezoso: se llama al inicio de las rutas de /api/reserve-funds/* en vez
-- de depender de una tarea programada de Windows.
CREATE FUNCTION close_elapsed_financial_periods() RETURNS void AS $$
BEGIN
  UPDATE financial_periods
     SET status = 'CLOSED', closed_at = now()
   WHERE status = 'OPEN'
     AND (year, month) < (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Asegura que exista el período del mes en curso desde ya.
SELECT get_or_create_financial_period(CURRENT_DATE);

-- =========================================================
-- 7. Reserva automática al pagar una cita
-- =========================================================
CREATE FUNCTION reserve_funds_for_payment(p_payment_id INTEGER) RETURNS void AS $$
DECLARE
  v_appointment_id INTEGER;
  v_customer_id    INTEGER;
  v_subtotal       NUMERIC(10, 2);
  v_discount       NUMERIC(10, 2);
  v_status         VARCHAR(10);
  v_voided         TIMESTAMPTZ;
  v_created_at     TIMESTAMPTZ;
  v_period_id      INTEGER;
  v_net_sale       NUMERIC(10, 2);
  v_cost           NUMERIC(10, 2);
  v_commission     NUMERIC(10, 2);
  v_technician_id  INTEGER;
  v_team_member_id INTEGER;
  v_costs_fund_id      INTEGER;
  v_commission_fund_id INTEGER;
  f RECORD;
  v_amount NUMERIC(10, 2);
BEGIN
  SELECT appointment_id, customer_id, subtotal, discount_amount, payment_status, voided_at, created_at
    INTO v_appointment_id, v_customer_id, v_subtotal, v_discount, v_status, v_voided, v_created_at
    FROM payments WHERE id = p_payment_id;

  IF v_status IS DISTINCT FROM 'PAID' OR v_voided IS NOT NULL THEN
    RETURN;
  END IF;

  v_period_id := get_or_create_financial_period(v_created_at::date);
  v_net_sale := GREATEST(v_subtotal - v_discount, 0);

  SELECT technician_id INTO v_technician_id FROM appointments WHERE id = v_appointment_id;
  SELECT tm.id INTO v_team_member_id FROM team_members tm WHERE tm.user_id = v_technician_id;

  -- Costo real de los servicios de la cita (snapshot congelado por línea).
  SELECT COALESCE(SUM(cost_at_booking), 0) INTO v_cost
    FROM appointment_services WHERE appointment_id = v_appointment_id;

  -- Comisión generada para esta cita (ya calculada por trg_payments_generate_commissions,
  -- que corre antes por orden alfabético de trigger — ver comentario en la sección 9).
  SELECT COALESCE(SUM(ce.commission_amount), 0) INTO v_commission
    FROM commission_entries ce
    JOIN appointment_services aps ON aps.id = ce.appointment_service_id
   WHERE aps.appointment_id = v_appointment_id
     AND ce.status <> 'voided';

  SELECT id INTO v_costs_fund_id FROM reserve_funds WHERE kind = 'SERVICE_COST';
  SELECT id INTO v_commission_fund_id FROM reserve_funds WHERE kind = 'COMMISSION';

  IF v_cost > 0 THEN
    INSERT INTO fund_movements
      (fund_id, financial_period_id, direction, amount, movement_type, source_type,
       payment_id, appointment_id, customer_id, concept, created_by)
    VALUES
      (v_costs_fund_id, v_period_id, 'IN', v_cost, 'AUTO_SERVICE_COST', 'payment',
       p_payment_id, v_appointment_id, v_customer_id,
       'Costo de servicios — pago #' || p_payment_id, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_commission > 0 THEN
    INSERT INTO fund_movements
      (fund_id, financial_period_id, direction, amount, movement_type, source_type,
       payment_id, appointment_id, customer_id, team_member_id, concept, created_by)
    VALUES
      (v_commission_fund_id, v_period_id, 'IN', v_commission, 'AUTO_COMMISSION', 'payment',
       p_payment_id, v_appointment_id, v_customer_id, v_team_member_id,
       'Comisión generada — pago #' || p_payment_id, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Fondos personalizados con reserva automática.
  FOR f IN
    SELECT id, name, reservation_type, reservation_value
      FROM reserve_funds
     WHERE kind = 'CUSTOM' AND is_active
       AND reservation_type IN ('FIXED_AMOUNT', 'PERCENTAGE', 'SERVICE_COST', 'COMMISSION_BASED')
  LOOP
    v_amount := CASE f.reservation_type
      WHEN 'FIXED_AMOUNT' THEN f.reservation_value
      WHEN 'PERCENTAGE' THEN ROUND(v_net_sale * f.reservation_value / 100.0, 2)
      WHEN 'SERVICE_COST' THEN v_cost
      WHEN 'COMMISSION_BASED' THEN v_commission
    END;

    IF v_amount IS NOT NULL AND v_amount > 0 THEN
      INSERT INTO fund_movements
        (fund_id, financial_period_id, direction, amount,
         movement_type, source_type, payment_id, appointment_id, customer_id, team_member_id, concept, created_by)
      VALUES
        (f.id, v_period_id, 'IN', v_amount,
         CASE WHEN f.reservation_type = 'FIXED_AMOUNT' THEN 'AUTO_FIXED'
              WHEN f.reservation_type = 'PERCENTAGE' THEN 'AUTO_PERCENTAGE'
              WHEN f.reservation_type = 'SERVICE_COST' THEN 'AUTO_SERVICE_COST'
              ELSE 'AUTO_COMMISSION' END,
         'payment', p_payment_id, v_appointment_id, v_customer_id,
         CASE WHEN f.reservation_type = 'COMMISSION_BASED' THEN v_team_member_id ELSE NULL END,
         f.name || ' — pago #' || p_payment_id, NULL)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Al anular un pago: los movimientos generados por ese pago se anulan (nunca se
-- borran), igual criterio que void_commissions_for_payment.
CREATE FUNCTION void_fund_reservations_for_payment(p_payment_id INTEGER) RETURNS void AS $$
BEGIN
  UPDATE fund_movements
     SET voided_at = now()
   WHERE payment_id = p_payment_id
     AND source_type = 'payment'
     AND voided_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 8. Reserva del fondo de Comisiones al pagarle a un empleado
-- =========================================================
-- Un commission_payout se crea YA con status='paid' en un solo INSERT (ver
-- src/app/api/commission-payments/route.ts) — no hay transición draft→paid que
-- trackear, basta un AFTER INSERT condicionado.
CREATE FUNCTION decrement_commission_fund_for_payout() RETURNS trigger AS $$
DECLARE
  v_period_id INTEGER;
  v_fund_id   INTEGER;
  v_employee_name VARCHAR(150);
BEGIN
  v_period_id := get_or_create_financial_period(NEW.paid_at::date);
  SELECT id INTO v_fund_id FROM reserve_funds WHERE kind = 'COMMISSION';

  SELECT u.name INTO v_employee_name
    FROM team_members tm JOIN users u ON u.id = tm.user_id
   WHERE tm.id = NEW.team_member_id;

  INSERT INTO fund_movements
    (fund_id, financial_period_id, direction, amount, movement_type, source_type,
     commission_payout_id, team_member_id, concept, created_by)
  VALUES
    (v_fund_id, v_period_id, 'OUT', NEW.total_amount, 'COMMISSION_PAYOUT', 'commission_payout',
     NEW.id, NEW.team_member_id, 'Pago de comisiones a ' || COALESCE(v_employee_name, 'empleado'), NEW.created_by);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commission_payouts_reserve_fund
  AFTER INSERT ON commission_payouts
  FOR EACH ROW WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION decrement_commission_fund_for_payout();

-- =========================================================
-- 9. Disparador único sobre payments — reserva al pagar, anula al anular
-- =========================================================
-- El nombre del trigger es a propósito "trg_payments_reserve_funds": Postgres
-- dispara los triggers de un mismo evento en orden alfabético de NOMBRE, y este
-- nombre ordena DESPUÉS de "trg_payments_generate_commissions" (017_employee_payroll.sql).
-- reserve_funds_for_payment() depende de que commission_entries ya exista para esta
-- cita — si algún día se renombra cualquiera de los dos triggers, hay que preservar
-- ese orden o el fondo de Comisiones quedará siempre en 0 para pagos nuevos.
CREATE FUNCTION trg_payments_reserve_funds_fn() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'PAID' AND NEW.voided_at IS NULL THEN
      PERFORM reserve_funds_for_payment(NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
      PERFORM void_fund_reservations_for_payment(NEW.id);
    ELSIF NEW.payment_status = 'PAID' AND NEW.voided_at IS NULL
          AND OLD.payment_status IS DISTINCT FROM 'PAID' THEN
      PERFORM reserve_funds_for_payment(NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_reserve_funds
  AFTER INSERT OR UPDATE OF payment_status, voided_at ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payments_reserve_funds_fn();

-- =========================================================
-- 10. Permisos del módulo
-- =========================================================
INSERT INTO permissions (key, category, description) VALUES
  ('funds.view',       'finanzas', 'Ver el panel de Fondos Reservados, sus movimientos y reportes'),
  ('funds.manage',     'finanzas', 'Crear, editar y eliminar fondos personalizados, y cerrar períodos manualmente'),
  ('funds.contribute', 'finanzas', 'Registrar aportes y retiros manuales en cualquier fondo');

-- Admin: los tres. Receptionist/technician: ninguno por defecto — el acceso puntual
-- tipo "Gerente" se resuelve otorgando funds.view/funds.contribute por usuario vía
-- user_permission_overrides (ya existe, ver 006_roles_and_permissions.sql), sin
-- necesidad de un rol nuevo.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.key IN ('funds.view', 'funds.manage', 'funds.contribute');
