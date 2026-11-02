-- Seguimiento de clientes: varias citas de la misma categoría el MISMO día (p. ej. dos
-- técnicas atendiendo a la vez) contaban como visitas distintas con 0 días entre ellas.
-- Promedio 0 → "próxima visita" = ese mismo día → la clienta salía como VENCIDA el día
-- después de venir. Ahora una visita es un (categoría, día): se cuentan días distintos
-- y los intervalos se miden entre días distintos.
CREATE OR REPLACE FUNCTION recompute_customer_category_stats(p_customer_id INTEGER)
RETURNS void AS $$
DECLARE
  v_upcoming_window INTEGER;
BEGIN
  IF p_customer_id IS NULL THEN RETURN; END IF;

  SELECT upcoming_window_days INTO v_upcoming_window
    FROM customer_followup_settings WHERE id = 1;
  v_upcoming_window := COALESCE(v_upcoming_window, 7);

  -- Reconstruir las visitas del cliente desde cero, agrupando por (cita, categoría):
  -- varios servicios de la misma categoría en una cita cuentan como UNA visita.
  DELETE FROM customer_category_visits WHERE customer_id = p_customer_id;

  INSERT INTO customer_category_visits
    (customer_id, appointment_id, service_category_id, visit_date, amount_paid, employee_id)
  SELECT a.customer_id, a.id, s.category_id, a.appointment_date,
         SUM(aps.price_at_booking), a.technician_id
    FROM appointments a
    JOIN appointment_services aps ON aps.appointment_id = a.id
    JOIN services s ON s.id = aps.service_id
   WHERE a.customer_id = p_customer_id
     AND (
       a.status = 'completed'
       OR EXISTS (
         SELECT 1 FROM payments p
          WHERE p.appointment_id = a.id AND p.voided_at IS NULL AND p.payment_status = 'PAID'
       )
     )
   GROUP BY a.customer_id, a.id, s.category_id, a.appointment_date, a.technician_id;

  -- Quitar estadísticas de categorías que ya no tengan ninguna visita (p. ej. se
  -- anuló el único pago de esa categoría).
  DELETE FROM customer_category_statistics st
   WHERE st.customer_id = p_customer_id
     AND NOT EXISTS (
       SELECT 1 FROM customer_category_visits v
        WHERE v.customer_id = st.customer_id AND v.service_category_id = st.service_category_id
     );

  -- Recalcular cada categoría: diferencias consecutivas de fecha → promedio →
  -- próxima fecha estimada → estado, según la configuración.
  WITH diffs AS (
    SELECT service_category_id, visit_date,
           visit_date - LAG(visit_date) OVER (PARTITION BY service_category_id ORDER BY visit_date) AS gap_days
      FROM (SELECT DISTINCT service_category_id, visit_date
              FROM customer_category_visits
             WHERE customer_id = p_customer_id) d
  ),
  avgs AS (
    SELECT service_category_id, AVG(gap_days)::numeric AS avg_days
      FROM diffs WHERE gap_days IS NOT NULL
     GROUP BY service_category_id
  ),
  fav AS (
    SELECT DISTINCT ON (service_category_id) service_category_id, employee_id AS favorite_employee_id
      FROM (
        SELECT service_category_id, employee_id, COUNT(*) AS c, MAX(visit_date) AS last_seen
          FROM customer_category_visits
         WHERE customer_id = p_customer_id AND employee_id IS NOT NULL
         GROUP BY service_category_id, employee_id
      ) counts
     ORDER BY service_category_id, c DESC, last_seen DESC
  ),
  base AS (
    SELECT v.service_category_id,
           COUNT(DISTINCT v.visit_date) AS total_visits,
           SUM(v.amount_paid) AS total_spent,
           MAX(v.visit_date) AS last_visit_date,
           (SELECT v2.id FROM customer_category_visits v2
             WHERE v2.customer_id = p_customer_id AND v2.service_category_id = v.service_category_id
             ORDER BY v2.visit_date DESC, v2.id DESC LIMIT 1) AS last_visit_row_id
      FROM customer_category_visits v
     WHERE v.customer_id = p_customer_id
     GROUP BY v.service_category_id
  )
  INSERT INTO customer_category_statistics (
    customer_id, service_category_id, last_appointment_id, last_visit_date,
    average_days_between_visits, estimated_next_visit, total_visits, total_spent,
    favorite_employee_id, status, updated_at
  )
  SELECT
    p_customer_id,
    b.service_category_id,
    lv.appointment_id,
    b.last_visit_date,
    a.avg_days,
    CASE WHEN a.avg_days IS NOT NULL THEN b.last_visit_date + ROUND(a.avg_days)::int ELSE NULL END,
    b.total_visits,
    b.total_spent,
    f.favorite_employee_id,
    CASE
      WHEN b.total_visits < 2 OR a.avg_days IS NULL THEN 'INSUFFICIENT_DATA'
      WHEN CURRENT_DATE > (b.last_visit_date + ROUND(a.avg_days)::int) THEN 'OVERDUE'
      WHEN CURRENT_DATE >= (b.last_visit_date + ROUND(a.avg_days)::int - v_upcoming_window) THEN 'UPCOMING'
      ELSE 'ON_TIME'
    END,
    now()
  FROM base b
  LEFT JOIN avgs a ON a.service_category_id = b.service_category_id
  LEFT JOIN fav f ON f.service_category_id = b.service_category_id
  JOIN customer_category_visits lv ON lv.id = b.last_visit_row_id
  ON CONFLICT (customer_id, service_category_id) DO UPDATE SET
    last_appointment_id = EXCLUDED.last_appointment_id,
    last_visit_date = EXCLUDED.last_visit_date,
    average_days_between_visits = EXCLUDED.average_days_between_visits,
    estimated_next_visit = EXCLUDED.estimated_next_visit,
    total_visits = EXCLUDED.total_visits,
    total_spent = EXCLUDED.total_spent,
    favorite_employee_id = EXCLUDED.favorite_employee_id,
    status = EXCLUDED.status,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
