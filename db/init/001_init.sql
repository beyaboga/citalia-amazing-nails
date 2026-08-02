-- Amazing Nails Admin — esquema inicial
-- Se ejecuta automáticamente por Postgres solo la primera vez que se crea el volumen.

-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE user_role AS ENUM ('owner', 'reception', 'technician');
CREATE TYPE customer_status AS ENUM ('active', 'inactive', 'vip');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'inactive');
CREATE TYPE non_working_day_type AS ENUM ('holiday', 'closure', 'maintenance');
CREATE TYPE time_format_type AS ENUM ('12h', '24h');
CREATE TYPE backup_frequency_type AS ENUM ('daily', 'weekly', 'monthly');

-- Mantiene updated_at al día en cada UPDATE
CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 1. users (personal: dueño, recepción, técnicos)
-- =========================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 2. customers
-- =========================================================
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  image_url TEXT,
  image_alt TEXT,
  status customer_status NOT NULL DEFAULT 'active',
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_visit DATE,
  birthday DATE,
  preferred_technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  preferred_time_slots TEXT[] NOT NULL DEFAULT '{}',
  color_preferences TEXT,
  preferred_contact_methods TEXT[] NOT NULL DEFAULT '{}',
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  appointment_reminders BOOLEAN NOT NULL DEFAULT true,
  promotional_emails BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_preferred_technician ON customers(preferred_technician_id);
CREATE INDEX idx_customers_status ON customers(status);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 3. service_categories
-- =========================================================
CREATE TABLE service_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(100)
);

-- =========================================================
-- 4. services
-- =========================================================
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  image_alt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_is_active ON services(is_active);

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 5. customer_favorite_services (N:N)
-- =========================================================
CREATE TABLE customer_favorite_services (
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, service_id)
);

-- =========================================================
-- 6. appointments
-- =========================================================
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_technician ON appointments(technician_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 7. appointment_services (N:N con snapshot de precio/duración)
-- =========================================================
CREATE TABLE appointment_services (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price_at_booking NUMERIC(10, 2) NOT NULL,
  duration_at_booking INTEGER NOT NULL
);

CREATE INDEX idx_appointment_services_appointment ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON appointment_services(service_id);

-- =========================================================
-- 8. customer_notes
-- =========================================================
CREATE TABLE customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);

-- =========================================================
-- 9. operating_hours (una fila por día de la semana)
-- =========================================================
CREATE TABLE operating_hours (
  id SERIAL PRIMARY KEY,
  day_of_week SMALLINT NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo … 6=sábado
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- =========================================================
-- 10. operating_hour_slots (franjas horarias por día)
-- =========================================================
CREATE TABLE operating_hour_slots (
  id SERIAL PRIMARY KEY,
  operating_hours_id INTEGER NOT NULL REFERENCES operating_hours(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX idx_operating_hour_slots_hours ON operating_hour_slots(operating_hours_id);

-- =========================================================
-- 11. non_working_days
-- =========================================================
CREATE TABLE non_working_days (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  reason VARCHAR(200) NOT NULL,
  type non_working_day_type NOT NULL DEFAULT 'holiday'
);

-- =========================================================
-- 12. booking_policies (fila única de configuración)
-- =========================================================
CREATE TABLE booking_policies (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  minimum_advance_hours INTEGER NOT NULL DEFAULT 2,
  maximum_advance_days INTEGER NOT NULL DEFAULT 30,
  cancellation_hours INTEGER NOT NULL DEFAULT 24,
  reschedule_hours INTEGER NOT NULL DEFAULT 12,
  no_show_penalty BOOLEAN NOT NULL DEFAULT true,
  require_deposit BOOLEAN NOT NULL DEFAULT false,
  deposit_percentage INTEGER NOT NULL DEFAULT 20 CHECK (deposit_percentage BETWEEN 0 AND 100)
);

-- =========================================================
-- 13. system_preferences (fila única de configuración)
-- =========================================================
CREATE TABLE system_preferences (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  language VARCHAR(5) NOT NULL DEFAULT 'es',
  currency VARCHAR(5) NOT NULL DEFAULT 'HNL',
  time_format time_format_type NOT NULL DEFAULT '12h',
  date_format VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  notify_push BOOLEAN NOT NULL DEFAULT true,
  auto_backup BOOLEAN NOT NULL DEFAULT false,
  backup_frequency backup_frequency_type NOT NULL DEFAULT 'weekly'
);

-- =========================================================
-- Datos semilla para las tablas de configuración
-- (reflejan los valores por defecto que hoy están hardcodeados en el frontend)
-- =========================================================
INSERT INTO operating_hours (day_of_week, enabled) VALUES
  (0, false), -- domingo
  (1, true),  -- lunes
  (2, true),  -- martes
  (3, true),  -- miércoles
  (4, true),  -- jueves
  (5, true),  -- viernes
  (6, true);  -- sábado

INSERT INTO operating_hour_slots (operating_hours_id, start_time, end_time)
SELECT id, '09:00', '18:00' FROM operating_hours WHERE day_of_week BETWEEN 1 AND 5;

INSERT INTO operating_hour_slots (operating_hours_id, start_time, end_time)
SELECT id, '10:00', '16:00' FROM operating_hours WHERE day_of_week = 6;

INSERT INTO operating_hour_slots (operating_hours_id, start_time, end_time)
SELECT id, '10:00', '14:00' FROM operating_hours WHERE day_of_week = 0;

INSERT INTO non_working_days (date, reason, type) VALUES
  ('2026-01-01', 'Año Nuevo', 'holiday'),
  ('2026-12-25', 'Navidad', 'holiday'),
  ('2026-09-15', 'Día de la Independencia', 'holiday');

INSERT INTO booking_policies (id) VALUES (1);

INSERT INTO system_preferences (id) VALUES (1);
