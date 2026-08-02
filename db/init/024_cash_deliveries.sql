-- =========================================================
-- Entregas de Caja
-- =========================================================
-- NO es un arqueo de caja tradicional: registra cuándo una empleada entrega al
-- administrador el dinero de las citas que cobró, comparando lo que el sistema
-- dice que se cobró contra lo que realmente se recibió, por método de pago.
--
-- Los "3 estados" recomendados (Pagado / Pendiente de Entrega / Entregado) se
-- derivan sin columnas de estado nuevas: payment_status='PAID' (ya existe) +
-- is_delivered (nuevo). Un pago pertenece a UNA sola entrega (cash_delivery_id).
--
-- Todo aditivo: no se toca /api/payments, /api/payments/combined ni sus triggers.

-- =========================================================
-- 1. cash_deliveries — cabecera de la entrega
-- =========================================================
CREATE TABLE cash_deliveries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  received_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  delivery_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  system_amount NUMERIC(10, 2) NOT NULL CHECK (system_amount >= 0),
  received_amount NUMERIC(10, 2) NOT NULL CHECK (received_amount >= 0),
  difference NUMERIC(10, 2) NOT NULL,  -- received - system: +sobra, -falta
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_deliveries_employee ON cash_deliveries(employee_id);
CREATE INDEX idx_cash_deliveries_date ON cash_deliveries(delivery_date);

-- =========================================================
-- 2. cash_delivery_method_totals — comparación Sistema vs Recibido POR MÉTODO
-- =========================================================
-- El spec pide un solo campo "Recibido" por método para TODA la entrega (no por
-- cita); aquí vive esa conciliación.
CREATE TABLE cash_delivery_method_totals (
  id SERIAL PRIMARY KEY,
  cash_delivery_id INTEGER NOT NULL REFERENCES cash_deliveries(id) ON DELETE CASCADE,
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  system_amount NUMERIC(10, 2) NOT NULL CHECK (system_amount >= 0),
  received_amount NUMERIC(10, 2) NOT NULL CHECK (received_amount >= 0),
  difference NUMERIC(10, 2) NOT NULL,
  UNIQUE (cash_delivery_id, payment_method_id)
);

-- =========================================================
-- 3. cash_delivery_details — qué se incluyó (histórico, por línea de pago)
-- =========================================================
-- Una fila por cada línea de payment_details incluida (cubre pagos divididos).
-- Sin "recibido" por línea: eso se concilia por método (tabla anterior), no por cita.
CREATE TABLE cash_delivery_details (
  id SERIAL PRIMARY KEY,
  cash_delivery_id INTEGER NOT NULL REFERENCES cash_deliveries(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  payment_detail_id INTEGER REFERENCES payment_details(id) ON DELETE SET NULL,
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  expected_amount NUMERIC(10, 2) NOT NULL CHECK (expected_amount >= 0),
  -- Una línea de pago nunca puede repetirse en dos entregas distintas.
  UNIQUE (payment_detail_id)
);

CREATE INDEX idx_cash_delivery_details_delivery ON cash_delivery_details(cash_delivery_id);
CREATE INDEX idx_cash_delivery_details_payment ON cash_delivery_details(payment_id);

-- =========================================================
-- 4. payments — marca de entrega (aditivo, no rompe nada existente)
-- =========================================================
ALTER TABLE payments
  ADD COLUMN is_delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cash_delivery_id INTEGER REFERENCES cash_deliveries(id) ON DELETE SET NULL;

CREATE INDEX idx_payments_cash_delivery ON payments(cash_delivery_id);
CREATE INDEX idx_payments_pending_delivery ON payments(is_delivered) WHERE NOT is_delivered;

-- =========================================================
-- 5. Permiso — solo administrador (mismo criterio que payroll.pay/commissions.pay)
-- =========================================================
INSERT INTO permissions (key, category, description) VALUES
  ('cash.deliveries.manage', 'finanzas', 'Registrar y consultar entregas de caja de las empleadas al administrador');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin' AND p.key = 'cash.deliveries.manage';
