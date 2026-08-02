-- =========================================================
-- Módulo de Gastos (Egresos) + fuente única de movimientos de caja
-- =========================================================
-- Registra las salidas de dinero del negocio para obtener reportes de ingresos,
-- egresos y utilidad. NO es contabilidad ni inventario: solo el gasto y de qué
-- método de pago salió. Los métodos de pago se REUTILIZAN (payment_methods).
--
-- El saldo por método es DERIVADO (no hay tabla de saldos): un gasto 'PAID' entra
-- como salida en la vista cash_movements y baja el saldo; 'PENDING'/'VOIDED' no.
-- No se toca el módulo de pagos: la vista solo lo lee.

-- =========================================================
-- 1. expense_categories — mantenimiento de categorías
-- =========================================================
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO expense_categories (name) VALUES
  ('Materiales'), ('Servicios públicos'), ('Alquiler'), ('Sueldos'), ('Publicidad'),
  ('Mantenimiento'), ('Equipos'), ('Papelería'), ('Impuestos'), ('Otros');

-- =========================================================
-- 2. expenses — un gasto registrado
-- =========================================================
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  expense_category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  supplier_name VARCHAR(150),                     -- proveedor (opcional)
  description VARCHAR(200) NOT NULL,              -- concepto
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PAID', 'VOIDED')),
  receipt_file TEXT,                              -- nombre del comprobante en uploads/receipts
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_category ON expenses(expense_category_id);
CREATE INDEX idx_expenses_method ON expenses(payment_method_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 3. cash_movements — VISTA que unifica ingresos y egresos
-- =========================================================
-- Fuente única para reportes financieros y saldo por método:
--   ENTRADAS = líneas de pago de citas no anuladas (payment_details).
--   SALIDAS  = gastos efectivamente pagados (status = 'PAID').
-- Saldo por método = SUM(IN) − SUM(OUT) agrupado por payment_method_id.
CREATE VIEW cash_movements AS
  SELECT
    'IN'::text            AS direction,
    pd.payment_method_id  AS payment_method_id,
    pd.amount             AS amount,
    p.created_at::date    AS movement_date,
    'payment'::text       AS source_type,
    p.id                  AS source_id
  FROM payment_details pd
  JOIN payments p ON p.id = pd.payment_id
  WHERE p.voided_at IS NULL
  UNION ALL
  SELECT
    'OUT'::text,
    e.payment_method_id,
    e.amount,
    e.expense_date,
    'expense'::text,
    e.id
  FROM expenses e
  WHERE e.status = 'PAID';

-- =========================================================
-- 4. Permisos del módulo
-- =========================================================
INSERT INTO permissions (key, category, description) VALUES
  ('expenses.register', 'finanzas', 'Registrar gastos del negocio'),
  ('expenses.manage',   'finanzas', 'Editar, eliminar y anular gastos, y administrar categorías de gasto'),
  ('finance.reports',   'finanzas', 'Ver reportes financieros (ingresos, egresos y utilidad)');

-- Admin: los tres.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.key IN ('expenses.register', 'expenses.manage', 'finance.reports');

-- Recepcionista: solo registrar gastos (no edita pagados, no elimina, no ve reportes).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'receptionist'
  AND p.key = 'expenses.register';

-- Manicurista (technician): sin permisos (no se agrega ninguno).
