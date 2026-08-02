-- =========================================================
-- Comisiones: prorratear el descuento de la cita entre los servicios
-- =========================================================
-- Decisión de negocio: la comisión se calcula sobre el valor REALMENTE ingresado.
-- Un descuento aplicado a toda la cita (código promocional o ajuste manual del total)
-- se reparte entre las líneas de servicio en proporción a su precio, y la comisión
-- se calcula sobre ese precio efectivo (ya con el descuento) — respetando además la
-- base GROSS/NET.
--
-- Ejemplo: cita con servicios de L100 y L300 (subtotal L400) y descuento de L100.
-- El servicio de L100 absorbe 25% del descuento (L25) → precio efectivo L75.
-- Con 20% base NET (ISV 15%): base 75/1.15 = 65.22 → comisión 13.04.
--
-- Los ajustes de precio por servicio ya estaban cubiertos (viven en price_at_booking);
-- esto solo agrega el reparto del descuento a nivel de cita. Reemplaza la función de
-- 017 (los ajustes se marcan con >>> PRORRATEO).

CREATE OR REPLACE FUNCTION generate_commissions_for_payment(p_payment_id INTEGER)
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
  v_subtotal           NUMERIC(10, 2);  -- >>> PRORRATEO
  v_discount           NUMERIC(10, 2);  -- >>> PRORRATEO
  v_effective          NUMERIC(10, 2);  -- >>> PRORRATEO: precio de la línea ya con su parte del descuento
  aps                  RECORD;
  v_rule               RECORD;
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

  SELECT id, percentage INTO v_tax_id, v_isv
    FROM tax_configurations WHERE is_active LIMIT 1;
  v_isv := COALESCE(v_isv, 0);

  -- >>> PRORRATEO: subtotal (base del reparto) y descuento total de la cita.
  SELECT COALESCE(SUM(price_at_booking), 0) INTO v_subtotal
    FROM appointment_services WHERE appointment_id = v_appointment_id;
  SELECT COALESCE(SUM(discount_amount), 0) INTO v_discount
    FROM appointment_discounts WHERE appointment_id = v_appointment_id;

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

    -- >>> PRORRATEO: precio efectivo de la línea = precio − su parte proporcional
    -- del descuento de la cita. La comisión se calcula sobre este valor ingresado.
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
      v_commission := v_rule.value;  -- monto fijo: no depende del precio
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
