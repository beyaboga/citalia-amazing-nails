-- Módulo de códigos de descuento (promociones reutilizables) y su aplicación en citas.
--
-- Diseño:
--   * discount_codes: la definición del código (tipo, valor, vigencia, límites, reglas).
--   * discount_code_services / _categories / _customers: restricciones opcionales.
--     Si el flag applies_to_all_* es true, la tabla se ignora; si es false, la tabla
--     define el conjunto permitido.
--   * appointment_discounts: el descuento realmente aplicado a una cita, con snapshot
--     completo (código, tipo, valor, monto, subtotal, total) para conservar el historial
--     aunque el código cambie o se elimine después.

CREATE TABLE discount_codes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
  minimum_purchase NUMERIC(10, 2) CHECK (minimum_purchase IS NULL OR minimum_purchase >= 0),
  start_date DATE,
  end_date DATE,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 0),
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to_all_services BOOLEAN NOT NULL DEFAULT true,
  applies_to_all_customers BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TRIGGER trg_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE discount_code_services (
  id SERIAL PRIMARY KEY,
  discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE (discount_code_id, service_id)
);

CREATE TABLE discount_code_categories (
  id SERIAL PRIMARY KEY,
  discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  UNIQUE (discount_code_id, category_id)
);

CREATE TABLE discount_code_customers (
  id SERIAL PRIMARY KEY,
  discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE (discount_code_id, customer_id)
);

-- Descuento aplicado a una cita (una cita, un descuento).
CREATE TABLE appointment_discounts (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  discount_code_id INTEGER REFERENCES discount_codes(id) ON DELETE SET NULL,
  discount_code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  subtotal_before_discount NUMERIC(10, 2) NOT NULL,
  total_after_discount NUMERIC(10, 2) NOT NULL,
  applied_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discount_code_services_code ON discount_code_services(discount_code_id);
CREATE INDEX idx_discount_code_categories_code ON discount_code_categories(discount_code_id);
CREATE INDEX idx_discount_code_customers_code ON discount_code_customers(discount_code_id);
CREATE INDEX idx_appointment_discounts_code ON appointment_discounts(discount_code_id);
