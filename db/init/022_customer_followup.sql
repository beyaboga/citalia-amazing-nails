-- =========================================================
-- Seguimiento de clientes por CATEGORÍA de servicio
-- =========================================================
-- Identifica cuándo una clienta probablemente necesita regresar, según su
-- comportamiento real. La unidad de seguimiento es CLIENTE + CATEGORÍA (no por
-- servicio individual): distintos servicios de "Manos" cubren la misma necesidad,
-- así que se promedian juntos.
--
-- Diseño:
--   * Una visita = una fila por (cita, categoría), no por línea de servicio. Una
--     cita con 2 servicios de "Manos" cuenta como UNA sola visita a esa categoría.
--   * Recalculo por RECONSTRUCCIÓN: cada vez que cambia algo relevante del cliente,
--     se reconstruye desde cero customer_category_visits/statistics de ESE cliente
--     a partir de sus citas calificadas. Siempre refleja la verdad actual, sin
--     lógica de "qué cambió". Barato: pocas citas por cliente.
--   * Cita calificada = status='completed' O tiene un pago no anulado 'PAID'.
--   * Triggers nuevos, en paralelo a los existentes (mismo patrón que la
--     generación de comisiones en 018): no se toca el módulo de pagos ni el
--     trigger de comisiones.

-- =========================================================
-- 1. customer_followup_settings — configuración (singleton)
-- =========================================================
CREATE TABLE customer_followup_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Días antes de la fecha estimada para marcar "🟡 Próxima".
  upcoming_window_days INTEGER NOT NULL DEFAULT 7 CHECK (upcoming_window_days >= 0),
  -- "Perdido" (dashboard) = atrasado más de promedio * este multiplicador.
  lost_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1 CHECK (lost_multiplier > 0),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customer_followup_settings_updated_at
  BEFORE UPDATE ON customer_followup_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO customer_followup_settings (id) VALUES (1);

-- =========================================================
-- 2. customer_category_visits — una fila por (cita, categoría)
-- =========================================================
-- Tabla reconstruible (no histórico inmutable): se borra y reinserta por
-- cliente en cada recálculo, siempre a partir de las citas calificadas actuales.
CREATE TABLE customer_category_visits (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  visit_date DATE NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, service_category_id)
);

CREATE INDEX idx_customer_category_visits_customer_cat ON customer_category_visits(customer_id, service_category_id);
CREATE INDEX idx_customer_category_visits_date ON customer_category_visits(visit_date);

-- =========================================================
-- 3. customer_category_statistics — snapshot recalculado
-- =========================================================
CREATE TABLE customer_category_statistics (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  last_appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  last_visit_date DATE,
  average_days_between_visits NUMERIC(6, 2),
  estimated_next_visit DATE,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  favorite_employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'INSUFFICIENT_DATA'
    CHECK (status IN ('ON_TIME', 'UPCOMING', 'OVERDUE', 'INSUFFICIENT_DATA')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, service_category_id)
);

CREATE INDEX idx_customer_category_stats_status ON customer_category_statistics(status);
CREATE INDEX idx_customer_category_stats_next_visit ON customer_category_statistics(estimated_next_visit);

-- =========================================================
-- 4. Función de recálculo — el corazón del módulo
-- =========================================================
CREATE FUNCTION recompute_customer_category_stats(p_customer_id INTEGER)
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
      FROM customer_category_visits
     WHERE customer_id = p_customer_id
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
           COUNT(*) AS total_visits,
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

-- =========================================================
-- 5. Triggers — recalculan solo. No tocan pagos ni comisiones.
-- =========================================================
CREATE FUNCTION trg_customer_followup_from_appointment() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recompute_customer_category_stats(NEW.customer_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM recompute_customer_category_stats(NEW.customer_id);
    IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      PERFORM recompute_customer_category_stats(OLD.customer_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointments_customer_followup
  AFTER INSERT OR UPDATE OF status, customer_id ON appointments
  FOR EACH ROW EXECUTE FUNCTION trg_customer_followup_from_appointment();

CREATE FUNCTION trg_customer_followup_from_payment() RETURNS trigger AS $$
BEGIN
  PERFORM recompute_customer_category_stats(NEW.customer_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_customer_followup
  AFTER INSERT OR UPDATE OF payment_status, voided_at ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_customer_followup_from_payment();

-- Caso adicional: si los servicios de una cita cambian DESPUÉS de que la cita ya
-- califica (completada o pagada) — p. ej. una edición posterior —, se refleja de
-- inmediato. Guardado con un chequeo de "¿ya califica?" para no recalcular en cada
-- línea de una cita que todavía no califica (el caso normal de creación).
CREATE FUNCTION trg_customer_followup_from_services() RETURNS trigger AS $$
DECLARE
  v_appointment_id INTEGER;
  v_customer_id INTEGER;
  v_qualifies BOOLEAN;
BEGIN
  v_appointment_id := COALESCE(NEW.appointment_id, OLD.appointment_id);

  SELECT a.customer_id,
         (a.status = 'completed' OR EXISTS (
           SELECT 1 FROM payments p
            WHERE p.appointment_id = a.id AND p.voided_at IS NULL AND p.payment_status = 'PAID'
         ))
    INTO v_customer_id, v_qualifies
    FROM appointments a WHERE a.id = v_appointment_id;

  IF v_qualifies THEN
    PERFORM recompute_customer_category_stats(v_customer_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_services_customer_followup
  AFTER INSERT OR DELETE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION trg_customer_followup_from_services();
