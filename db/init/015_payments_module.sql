-- =========================================================
-- Módulo de pagos, propinas y recibos
-- =========================================================
-- El pago es una etapa POSTERIOR a la cita. No se toca la lógica de citas ni los
-- precios originales de los servicios: el "pendiente de pago" se deriva (una cita
-- sin pago registrado), no es un estado nuevo de la cita.
--
-- Las propinas se registran SIEMPRE separadas del ingreso del servicio, para poder
-- consultarlas y distribuirlas aparte. Los métodos de pago son configurables, con
-- un método fijo "Dividir pago" que no se puede eliminar.
--
-- Nota de diseño: el spec original define PaymentDetails y PaymentInstallments con
-- la misma estructura y propósito (una línea por método dentro de un pago). Se unen
-- en una sola tabla `payment_details`: un pago dividido es simplemente un pago con
-- varias líneas de detalle.

-- =========================================================
-- 1. payment_methods — mantenimiento de métodos de pago
-- =========================================================
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('CASH', 'TRANSFER', 'CARD', 'OTHER', 'SPLIT_PAYMENT')),
  bank VARCHAR(100),
  account VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- Los métodos del sistema (Dividir pago) no se pueden eliminar ni cambiar de tipo.
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A lo sumo un método marcado como predeterminado.
CREATE UNIQUE INDEX idx_payment_methods_one_default
  ON payment_methods ((is_default)) WHERE is_default;

CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Protección a nivel de base: un método del sistema nunca se borra, aunque alguien
-- se salte la API. Misma filosofía que el constraint de traslapes de citas.
CREATE FUNCTION prevent_system_payment_method_delete() RETURNS trigger AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'El método de pago "%" es del sistema y no se puede eliminar', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_methods_no_delete_system
  BEFORE DELETE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION prevent_system_payment_method_delete();

INSERT INTO payment_methods (name, type, bank, is_active, display_order, is_default, is_system) VALUES
  ('Efectivo',               'CASH',          NULL,        true, 1, true,  false),
  ('Transferencia BAC',      'TRANSFER',      'BAC',       true, 2, false, false),
  ('Transferencia Ficohsa',  'TRANSFER',      'Ficohsa',   true, 3, false, false),
  ('Transferencia Atlántida','TRANSFER',      'Atlántida', true, 4, false, false),
  ('POS',                    'CARD',          NULL,        true, 5, false, false),
  -- Método fijo: permite pagos parciales. No requiere configuración ni se elimina.
  ('Dividir pago',           'SPLIT_PAYMENT', NULL,        true, 99, false, true);

-- =========================================================
-- 2. tip_settings — opciones de propina configurables
-- =========================================================
CREATE TABLE tip_settings (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
  value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Presets de arranque. "Personalizada" no es una fila: es siempre una opción en la UI.
INSERT INTO tip_settings (type, value, is_active, display_order) VALUES
  ('PERCENTAGE', 5,  true, 1),
  ('PERCENTAGE', 10, true, 2),
  ('PERCENTAGE', 15, true, 3);

-- =========================================================
-- 3. payments — cabecera del pago de una cita
-- =========================================================
-- ON DELETE RESTRICT hacia cita y cliente: un pago es un registro financiero y no
-- desaparece por borrar la cita. Anular un pago se hace con voided_at, no con DELETE.
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  -- Subtotal = suma de los precios APLICADOS de los servicios (no el catálogo).
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  -- Total a cobrar = subtotal − descuentos + propina.
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  -- Suma de payment_details. En un pago parcial queda por debajo de total_amount.
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_status VARCHAR(10) NOT NULL CHECK (payment_status IN ('PAID', 'PARTIAL', 'PENDING')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Anulación (auditada): el pago se conserva, solo se marca.
  voided_at TIMESTAMPTZ,
  voided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  void_reason TEXT
);

-- Una cita tiene a lo sumo un pago vigente; si se anula, puede cobrarse de nuevo.
CREATE UNIQUE INDEX idx_payments_one_active_per_appointment
  ON payments (appointment_id) WHERE voided_at IS NULL;
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 4. payment_details — líneas del pago (una por método)
-- =========================================================
-- Un pago normal tiene una línea; uno dividido tiene varias. `reference` guarda el
-- número de transferencia, voucher, etc.
CREATE TABLE payment_details (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  reference VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_details_payment ON payment_details(payment_id);
CREATE INDEX idx_payment_details_method ON payment_details(payment_method_id);

-- =========================================================
-- 5. appointment_tips — propina aplicada a una cita
-- =========================================================
-- Se guarda aparte del pago del servicio. received_by distingue si la recibió la
-- caja (para distribuir luego) o directamente el/la empleada.
CREATE TABLE appointment_tips (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
  tip_type VARCHAR(10) NOT NULL CHECK (tip_type IN ('PERCENTAGE', 'FIXED')),
  percentage NUMERIC(5, 2),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  received_by VARCHAR(10) NOT NULL CHECK (received_by IN ('CASHIER', 'EMPLOYEE')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING_DISTRIBUTION'
    CHECK (status IN ('PENDING_DISTRIBUTION', 'DISTRIBUTED')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_tips_appointment ON appointment_tips(appointment_id);
CREATE INDEX idx_appointment_tips_status ON appointment_tips(status);

-- =========================================================
-- 6. tip_distribution — reparto de una propina entre empleados
-- =========================================================
CREATE TABLE tip_distribution (
  id SERIAL PRIMARY KEY,
  appointment_tip_id INTEGER NOT NULL REFERENCES appointment_tips(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  distribution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  distributed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tip_distribution_tip ON tip_distribution(appointment_tip_id);
CREATE INDEX idx_tip_distribution_employee ON tip_distribution(employee_id);

-- =========================================================
-- 7. receipt_settings — encabezado del recibo (singleton)
-- =========================================================
CREATE TABLE receipt_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name VARCHAR(150) NOT NULL DEFAULT 'Amazing Nails',
  address TEXT,
  phone VARCHAR(30),
  logo_url TEXT,
  footer_message TEXT,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_receipt_settings_updated_at
  BEFORE UPDATE ON receipt_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO receipt_settings (id, business_name, address, phone, footer_message) VALUES
  (1, 'Amazing Nails',
   'Plaza Isabelle, contiguo a Bac Credomatic, Local #8, Choluteca',
   NULL,
   '¡Gracias por su preferencia!');

-- =========================================================
-- 8. receipt_numbering — numeración automática (singleton, "caliente")
-- =========================================================
-- Se separa del encabezado porque se bloquea y actualiza en CADA pago, mientras que
-- el encabezado casi nunca cambia. next_sequence es el próximo número a asignar.
CREATE TABLE receipt_numbering (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  prefix VARCHAR(20) NOT NULL DEFAULT 'FAC-',
  next_sequence INTEGER NOT NULL DEFAULT 1 CHECK (next_sequence >= 1),
  -- Relleno con ceros a la izquierda: 5 → FAC-00001.
  padding INTEGER NOT NULL DEFAULT 5 CHECK (padding BETWEEN 1 AND 12),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_receipt_numbering_updated_at
  BEFORE UPDATE ON receipt_numbering
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO receipt_numbering (id, prefix, next_sequence, padding) VALUES (1, 'FAC-', 1, 5);

-- =========================================================
-- 9. receipts — recibo emitido por un pago
-- =========================================================
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  prefix VARCHAR(20) NOT NULL,
  sequence_number INTEGER NOT NULL,
  issued_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_receipts_number ON receipts(receipt_number);

-- =========================================================
-- 10. Permisos del módulo
-- =========================================================
-- "Configurar métodos / propinas / recibos" se apoya en settings.manage (solo admin
-- lo tiene). Los permisos nuevos cubren lo operativo y la distribución de propinas.
INSERT INTO permissions (key, category, description) VALUES
  ('payments.charge',  'pagos', 'Cobrar citas, aplicar métodos de pago y registrar propinas'),
  ('payments.void',    'pagos', 'Modificar y anular pagos'),
  ('tips.distribute',  'pagos', 'Ver y registrar la distribución de propinas');

-- Admin: recibe los tres (el seed original de admin fue único, no se auto-agregan).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.key IN ('payments.charge', 'payments.void', 'tips.distribute');

-- Recepcionista: cobra citas y registra propinas, pero no anula ni distribuye.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'receptionist'
  AND p.key = 'payments.charge';

-- Técnico (manicurista): sin permisos de cobro (no se agrega ninguno).
