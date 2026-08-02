-- =========================================================
-- Comisión escalonada por monto total de la cita
-- =========================================================
-- Tercer modo de cálculo de comisión, además de porcentaje/monto fijo por servicio:
-- un esquema puede pagar un monto fijo según el rango en que caiga el TOTAL de la
-- cita (ya con descuentos aplicados), en vez de mirar cada línea de servicio por
-- separado. Es mutuamente excluyente con las reglas por servicio (commission_rules)
-- dentro de un mismo esquema.
--
-- commission_entries pasa a ser polimórfica: una fila "por línea de servicio" (como
-- hoy, appointment_service_id) o una fila "por cita completa" (nuevo, appointment_id)
-- — nunca ambos — para que el monto escalonado quede exacto y auditable en vez de
-- repartirse artificialmente entre servicios.

-- 1. Modo de cálculo del esquema.
ALTER TABLE commission_schemes
  ADD COLUMN calculation_mode VARCHAR(12) NOT NULL DEFAULT 'PER_SERVICE'
    CHECK (calculation_mode IN ('PER_SERVICE', 'TIERED_TOTAL'));

-- 2. Catálogo: nuevo tipo de comisión (commission_types es catálogo abierto, sin ENUM,
-- según el diseño original del módulo — agregar un tipo no requiere tocar código).
INSERT INTO commission_types (code, name) VALUES ('tiered_total', 'Escalonado por monto de cita');

-- 3. Rangos de comisión por esquema.
CREATE TABLE commission_tiers (
  id SERIAL PRIMARY KEY,
  scheme_id INTEGER NOT NULL REFERENCES commission_schemes(id) ON DELETE CASCADE,
  min_amount NUMERIC(10, 2) NOT NULL CHECK (min_amount >= 0),
  max_amount NUMERIC(10, 2) CHECK (max_amount IS NULL OR max_amount > min_amount),
  commission_amount NUMERIC(10, 2) NOT NULL CHECK (commission_amount >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Protege contra rangos traslapados del mismo esquema (btree_gist ya habilitado
  -- en esta BD, mismo patrón que appointments_no_overlap).
  EXCLUDE USING gist (
    scheme_id WITH =,
    numrange(min_amount, max_amount, '[]') WITH &&
  ) WHERE (is_active)
);

CREATE INDEX idx_commission_tiers_scheme ON commission_tiers(scheme_id);

-- 4. commission_entries: volverla polimórfica (línea de servicio O cita completa).
ALTER TABLE commission_entries
  ALTER COLUMN appointment_service_id DROP NOT NULL,
  ALTER COLUMN service_id DROP NOT NULL,
  ADD COLUMN appointment_id INTEGER REFERENCES appointments(id) ON DELETE RESTRICT,
  ADD COLUMN commission_tier_id INTEGER REFERENCES commission_tiers(id) ON DELETE SET NULL,
  ADD CONSTRAINT commission_entries_target_check CHECK (
    (appointment_service_id IS NOT NULL AND appointment_id IS NULL) OR
    (appointment_service_id IS NULL AND appointment_id IS NOT NULL)
  );

CREATE UNIQUE INDEX uq_commission_entries_appointment
  ON commission_entries(appointment_id) WHERE appointment_id IS NOT NULL;

-- 5. Trigger de generación: nueva rama TIERED_TOTAL antes del loop por línea.
CREATE OR REPLACE FUNCTION generate_commissions_for_payment(p_payment_id INTEGER)
RETURNS void AS $$
DECLARE
  v_appointment_id     INTEGER;
  v_status             VARCHAR(10);
  v_voided             TIMESTAMPTZ;
  v_technician_user_id INTEGER;
  v_team_member_id     INTEGER;
  v_scheme_id          INTEGER;
  v_calculation_mode   VARCHAR(12);
  v_payment_scheme     VARCHAR(30);
  v_tax_id             INTEGER;
  v_isv                NUMERIC(5, 2);
  v_subtotal           NUMERIC(10, 2);
  v_discount           NUMERIC(10, 2);
  v_effective          NUMERIC(10, 2);
  v_total              NUMERIC(10, 2);
  aps                  RECORD;
  v_rule               RECORD;
  v_tier                RECORD;
  v_base               NUMERIC(10, 2);
  v_tax_amount         NUMERIC(10, 2);
  v_commission         NUMERIC(10, 2);
BEGIN
  SELECT appointment_id, payment_status, voided_at
    INTO v_appointment_id, v_status, v_voided
    FROM payments WHERE id = p_payment_id;

  IF v_status IS DISTINCT FROM 'PAID' OR v_voided IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT technician_id INTO v_technician_user_id
    FROM appointments WHERE id = v_appointment_id;
  IF v_technician_user_id IS NULL THEN RETURN; END IF;

  SELECT tm.id, tm.commission_scheme_id
    INTO v_team_member_id, v_scheme_id
    FROM team_members tm WHERE tm.user_id = v_technician_user_id;
  IF v_team_member_id IS NULL OR v_scheme_id IS NULL THEN RETURN; END IF;

  SELECT payment_scheme INTO v_payment_scheme
    FROM employee_payment_configs WHERE team_member_id = v_team_member_id;
  IF v_payment_scheme = 'FIXED' THEN RETURN; END IF;

  SELECT calculation_mode INTO v_calculation_mode
    FROM commission_schemes WHERE id = v_scheme_id;

  SELECT id, percentage INTO v_tax_id, v_isv
    FROM tax_configurations WHERE is_active LIMIT 1;
  v_isv := COALESCE(v_isv, 0);

  SELECT COALESCE(SUM(price_at_booking), 0) INTO v_subtotal
    FROM appointment_services WHERE appointment_id = v_appointment_id;
  SELECT COALESCE(SUM(discount_amount), 0) INTO v_discount
    FROM appointment_discounts WHERE appointment_id = v_appointment_id;

  IF v_calculation_mode = 'TIERED_TOTAL' THEN
    v_total := GREATEST(0, v_subtotal - v_discount);

    SELECT id, commission_amount INTO v_tier
      FROM commission_tiers
     WHERE scheme_id = v_scheme_id AND is_active
       AND numrange(min_amount, max_amount, '[]') @> v_total
     ORDER BY min_amount
     LIMIT 1;

    IF v_tier.id IS NULL THEN RETURN; END IF;

    INSERT INTO commission_entries (
      appointment_id, team_member_id, commission_scheme_id, commission_tier_id,
      commission_type_code, base_amount, rate_value, commission_amount,
      status, service_price
    ) VALUES (
      v_appointment_id, v_team_member_id, v_scheme_id, v_tier.id,
      'tiered_total', v_total, v_tier.commission_amount, v_tier.commission_amount,
      'pending', v_total
    )
    ON CONFLICT (appointment_id) WHERE appointment_id IS NOT NULL DO NOTHING;

    RETURN;
  END IF;

  -- PER_SERVICE (comportamiento existente, sin cambios).
  FOR aps IN
    SELECT id, service_id, price_at_booking
      FROM appointment_services WHERE appointment_id = v_appointment_id
  LOOP
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

    IF v_rule.id IS NULL THEN CONTINUE; END IF;

    IF v_subtotal > 0 THEN
      v_effective := ROUND(aps.price_at_booking - (v_discount * aps.price_at_booking / v_subtotal), 2);
    ELSE
      v_effective := aps.price_at_booking;
    END IF;

    IF v_rule.calculation_base = 'NET' THEN
      v_base := ROUND(v_effective / (1 + v_isv / 100.0), 2);
      v_tax_amount := ROUND(v_effective - v_base, 2);
    ELSE
      v_base := v_effective;
      v_tax_amount := 0;
    END IF;

    IF v_rule.type_code = 'percentage' THEN
      v_commission := ROUND(v_base * v_rule.value / 100.0, 2);
    ELSE
      v_commission := v_rule.value;
    END IF;

    INSERT INTO commission_entries (
      appointment_service_id, team_member_id, service_id, commission_scheme_id,
      commission_rule_id, commission_type_code, base_amount, rate_value, commission_amount,
      status, service_price, calculation_base, tax_configuration_id, tax_percentage, tax_amount
    ) VALUES (
      aps.id, v_team_member_id, aps.service_id, v_scheme_id,
      v_rule.id, v_rule.type_code, v_base, v_rule.value, v_commission,
      'pending', v_effective, v_rule.calculation_base, v_tax_id, v_isv, v_tax_amount
    )
    ON CONFLICT (appointment_service_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Anular pago: también cubrir la fila escalonada de la cita (si seguía pendiente).
CREATE OR REPLACE FUNCTION void_commissions_for_payment(p_payment_id INTEGER)
RETURNS void AS $$
DECLARE
  v_appointment_id INTEGER;
BEGIN
  SELECT appointment_id INTO v_appointment_id FROM payments WHERE id = p_payment_id;
  IF v_appointment_id IS NULL THEN RETURN; END IF;

  UPDATE commission_entries
     SET status = 'voided'
   WHERE status IN ('pending', 'approved')
     AND (
       appointment_service_id IN (
         SELECT id FROM appointment_services WHERE appointment_id = v_appointment_id
       )
       OR appointment_id = v_appointment_id
     );
END;
$$ LANGUAGE plpgsql;
