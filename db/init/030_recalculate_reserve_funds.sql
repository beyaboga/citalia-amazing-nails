-- =========================================================
-- Fondos Reservados: recálculo manual del período actual
-- =========================================================
-- `trg_payments_reserve_funds` (029) solo alcanza pagos NUEVOS, hacia adelante.
-- Los pagos ya existentes en el período abierto cuando se activó el módulo (o
-- fondos personalizados creados a mitad de mes) nunca generaron su reserva. Esta
-- función rellena SOLO lo que falta — nunca duplica, mismo criterio que el
-- botón "Actualizar" de Seguimiento de Clientes (023_customer_followup_recalculate_all.sql).
--
-- Punto crítico que motivó esta migración: una comisión que YA SE PAGÓ
-- (commission_entries.status = 'paid', liquidada en un commission_payout que
-- puede ser anterior a que existiera este módulo) NUNCA debe reservarse ahora —
-- ese dinero ya salió de caja de verdad y no hay forma de "liberarla" después
-- porque el payout ya ocurrió. Por eso el recálculo solo suma comisiones en
-- estado pending/approved, a diferencia de reserve_funds_for_payment() (029) que
-- no necesita filtrar 'paid' porque corre en el mismo instante en que el pago
-- queda PAID, cuando las comisiones recién generadas siempre están 'pending'.
--
-- Solo opera sobre el período ABIERTO: un período cerrado ya es historial
-- inmutable (igual criterio que el cierre manual bloqueando aportes manuales).

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
        WHEN 'COMMISSION_BASED' THEN v_commission  -- misma exclusión de 'paid' que arriba
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
