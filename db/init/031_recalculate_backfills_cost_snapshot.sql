-- =========================================================
-- Fondos Reservados: el recálculo también debe "poner al día" el costo congelado
-- =========================================================
-- Bug detectado en producción: "Recalcular Fondos" solo generaba movimientos para
-- el Fondo de Comisiones, nunca para el Fondo de Costos de Servicios.
--
-- Causa: appointment_services.cost_at_booking se congela en el momento en que se
-- crea la línea de la cita (trigger snapshot_appointment_service_cost, 029). Todas
-- las citas creadas ANTES de que el admin cargara un costo real en el catálogo
-- (services.cost nace en 0) quedaron con cost_at_booking = 0 para siempre — y
-- recalculate_funds_for_period() (030) lee ese snapshot congelado, nunca el costo
-- vigente del servicio, así que nunca encontraba nada que reservar.
--
-- Fix: antes de sumar costos por cita, el recálculo ahora "pone al día" (una sola
-- vez) las líneas cuyo cost_at_booking sigue en 0 pero el servicio YA tiene un
-- costo real cargado — solo para pagos del período que se está recalculando, y
-- solo cuando el snapshot nunca se capturó (=0). Si el snapshot ya tiene un valor
-- distinto de 0 no se toca (sigue siendo el costo real vigente al momento de la
-- venta, igual que price_at_booking). Esto es intencionalmente parte del "rellenar
-- lo que falta" del recálculo — no afecta el trigger en vivo (029), que ya congela
-- correctamente el costo vigente en cada cita nueva desde que existe este módulo.

CREATE OR REPLACE FUNCTION recalculate_funds_for_period(p_period_id INTEGER)
RETURNS TABLE (fund_id INTEGER, fund_name TEXT, amount NUMERIC, movement_type TEXT) AS $$
DECLARE
  v_year  INTEGER;
  v_month INTEGER;
  v_status VARCHAR(10);
  v_costs_fund_id      INTEGER;
  v_commission_fund_id INTEGER;
  p RECORD;
  f RECORD;
  v_cost           NUMERIC(10, 2);
  v_commission     NUMERIC(10, 2);
  v_net_sale       NUMERIC(10, 2);
  v_team_member_id INTEGER;
  v_amount         NUMERIC(10, 2);
  v_new_id         INTEGER;
BEGIN
  SELECT year, month, status INTO v_year, v_month, v_status
    FROM financial_periods WHERE id = p_period_id;

  IF v_year IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;
  IF v_status = 'CLOSED' THEN
    RAISE EXCEPTION 'El período está cerrado; no se puede recalcular';
  END IF;

  -- Poner al día los snapshots de costo nunca capturados, solo para pagos de este
  -- período (ver comentario arriba).
  UPDATE appointment_services aps
     SET cost_at_booking = s.cost
    FROM services s, payments pay
   WHERE aps.service_id = s.id
     AND aps.appointment_id = pay.appointment_id
     AND aps.cost_at_booking = 0
     AND s.cost > 0
     AND pay.payment_status = 'PAID' AND pay.voided_at IS NULL
     AND EXTRACT(YEAR FROM pay.created_at)::int = v_year
     AND EXTRACT(MONTH FROM pay.created_at)::int = v_month;

  SELECT id INTO v_costs_fund_id FROM reserve_funds WHERE kind = 'SERVICE_COST';
  SELECT id INTO v_commission_fund_id FROM reserve_funds WHERE kind = 'COMMISSION';

  CREATE TEMP TABLE IF NOT EXISTS _recalc_result (
    fund_id INTEGER, fund_name TEXT, amount NUMERIC, movement_type TEXT
  ) ON COMMIT DROP;
  DELETE FROM _recalc_result;

  FOR p IN
    SELECT pay.id AS payment_id, pay.appointment_id, pay.customer_id, pay.subtotal, pay.discount_amount
      FROM payments pay
     WHERE pay.payment_status = 'PAID' AND pay.voided_at IS NULL
       AND EXTRACT(YEAR FROM pay.created_at)::int = v_year
       AND EXTRACT(MONTH FROM pay.created_at)::int = v_month
  LOOP
    v_net_sale := GREATEST(p.subtotal - p.discount_amount, 0);

    SELECT COALESCE(SUM(cost_at_booking), 0) INTO v_cost
      FROM appointment_services WHERE appointment_id = p.appointment_id;

    SELECT tm.id INTO v_team_member_id
      FROM team_members tm JOIN appointments a ON a.technician_id = tm.user_id
     WHERE a.id = p.appointment_id;

    -- Solo lo que TODAVÍA se debe (pending/approved) — nunca lo ya pagado ni lo anulado.
    SELECT COALESCE(SUM(ce.commission_amount), 0) INTO v_commission
      FROM commission_entries ce
      JOIN appointment_services aps ON aps.id = ce.appointment_service_id
     WHERE aps.appointment_id = p.appointment_id
       AND ce.status IN ('pending', 'approved');

    IF v_cost > 0 THEN
      v_new_id := NULL;
      INSERT INTO fund_movements
        (fund_id, financial_period_id, direction, amount, movement_type, source_type,
         payment_id, appointment_id, customer_id, concept, created_by)
      VALUES
        (v_costs_fund_id, p_period_id, 'IN', v_cost, 'AUTO_SERVICE_COST', 'payment',
         p.payment_id, p.appointment_id, p.customer_id, 'Costo de servicios — pago #' || p.payment_id, NULL)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_new_id;
      IF v_new_id IS NOT NULL THEN
        INSERT INTO _recalc_result VALUES (v_costs_fund_id, 'Fondo de Costos de Servicios', v_cost, 'AUTO_SERVICE_COST');
      END IF;
    END IF;

    IF v_commission > 0 THEN
      v_new_id := NULL;
      INSERT INTO fund_movements
        (fund_id, financial_period_id, direction, amount, movement_type, source_type,
         payment_id, appointment_id, customer_id, team_member_id, concept, created_by)
      VALUES
        (v_commission_fund_id, p_period_id, 'IN', v_commission, 'AUTO_COMMISSION', 'payment',
         p.payment_id, p.appointment_id, p.customer_id, v_team_member_id,
         'Comisión generada — pago #' || p.payment_id, NULL)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_new_id;
      IF v_new_id IS NOT NULL THEN
        INSERT INTO _recalc_result VALUES (v_commission_fund_id, 'Fondo de Comisiones', v_commission, 'AUTO_COMMISSION');
      END IF;
    END IF;

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
        v_new_id := NULL;
        INSERT INTO fund_movements
          (fund_id, financial_period_id, direction, amount, movement_type, source_type,
           payment_id, appointment_id, customer_id, team_member_id, concept, created_by)
        VALUES
          (f.id, p_period_id, 'IN', v_amount,
           CASE WHEN f.reservation_type = 'FIXED_AMOUNT' THEN 'AUTO_FIXED'
                WHEN f.reservation_type = 'PERCENTAGE' THEN 'AUTO_PERCENTAGE'
                WHEN f.reservation_type = 'SERVICE_COST' THEN 'AUTO_SERVICE_COST'
                ELSE 'AUTO_COMMISSION' END,
           'payment', p.payment_id, p.appointment_id, p.customer_id,
           CASE WHEN f.reservation_type = 'COMMISSION_BASED' THEN v_team_member_id ELSE NULL END,
           f.name || ' — pago #' || p.payment_id, NULL)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN
          INSERT INTO _recalc_result VALUES (
            f.id, f.name, v_amount,
            CASE WHEN f.reservation_type = 'FIXED_AMOUNT' THEN 'AUTO_FIXED'
                 WHEN f.reservation_type = 'PERCENTAGE' THEN 'AUTO_PERCENTAGE'
                 WHEN f.reservation_type = 'SERVICE_COST' THEN 'AUTO_SERVICE_COST'
                 ELSE 'AUTO_COMMISSION' END
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT * FROM _recalc_result;
END;
$$ LANGUAGE plpgsql;
