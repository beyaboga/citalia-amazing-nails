-- Comisiones: tipo de comisión (catálogo, no ENUM, para poder agregar tipos nuevos
-- sin migración), reglas por esquema/servicio/categoría, y snapshot histórico de
-- cada comisión ganada — mismo principio que appointment_services.price_at_booking.
-- Ver docs/team-permissions-architecture.md (Parte B) para el diseño completo.

CREATE TYPE commission_entry_status AS ENUM ('pending', 'approved', 'paid', 'voided');
CREATE TYPE commission_payout_status AS ENUM ('draft', 'approved', 'paid');

-- =========================================================
-- 1. commission_types (catálogo)
-- =========================================================
CREATE TABLE commission_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

INSERT INTO commission_types (code, name) VALUES
  ('percentage', 'Porcentaje'),
  ('fixed_amount', 'Monto fijo');

-- =========================================================
-- 2. commission_schemes (plantillas reutilizables entre técnicos)
-- =========================================================
CREATE TABLE commission_schemes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_commission_schemes_updated_at
  BEFORE UPDATE ON commission_schemes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 3. commission_rules (servicio > categoría > regla por defecto)
-- =========================================================
CREATE TABLE commission_rules (
  id SERIAL PRIMARY KEY,
  scheme_id INTEGER NOT NULL REFERENCES commission_schemes(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
  commission_type_id INTEGER NOT NULL REFERENCES commission_types(id) ON DELETE RESTRICT,
  value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
  config JSONB,
  CHECK (service_id IS NULL OR category_id IS NULL)
);

CREATE INDEX idx_commission_rules_scheme ON commission_rules(scheme_id);

-- Como máximo una regla por servicio, una por categoría, y una regla
-- por defecto (sin servicio ni categoría) por esquema.
CREATE UNIQUE INDEX uq_commission_rules_service
  ON commission_rules(scheme_id, service_id) WHERE service_id IS NOT NULL;
CREATE UNIQUE INDEX uq_commission_rules_category
  ON commission_rules(scheme_id, category_id) WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX uq_commission_rules_default
  ON commission_rules(scheme_id) WHERE service_id IS NULL AND category_id IS NULL;

-- =========================================================
-- 4. team_members.commission_scheme_id (esquema vigente hoy)
-- =========================================================
ALTER TABLE team_members
  ADD COLUMN commission_scheme_id INTEGER REFERENCES commission_schemes(id) ON DELETE SET NULL;

CREATE INDEX idx_team_members_commission_scheme ON team_members(commission_scheme_id);

-- =========================================================
-- 5. commission_payouts (liquidaciones)
-- =========================================================
CREATE TABLE commission_payouts (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status commission_payout_status NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_commission_payouts_member ON commission_payouts(team_member_id);

-- =========================================================
-- 6. commission_entries (una fila por servicio de cita completada, congelada)
-- =========================================================
CREATE TABLE commission_entries (
  id SERIAL PRIMARY KEY,
  appointment_service_id INTEGER NOT NULL UNIQUE REFERENCES appointment_services(id) ON DELETE RESTRICT,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  commission_scheme_id INTEGER NOT NULL REFERENCES commission_schemes(id) ON DELETE RESTRICT,
  commission_rule_id INTEGER REFERENCES commission_rules(id) ON DELETE SET NULL,
  commission_type_code VARCHAR(30) NOT NULL,
  base_amount NUMERIC(10, 2) NOT NULL,
  rate_value NUMERIC(10, 2) NOT NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  status commission_entry_status NOT NULL DEFAULT 'pending',
  payout_id INTEGER REFERENCES commission_payouts(id) ON DELETE SET NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_commission_entries_member ON commission_entries(team_member_id);
CREATE INDEX idx_commission_entries_payout ON commission_entries(payout_id);
CREATE INDEX idx_commission_entries_status ON commission_entries(status);
