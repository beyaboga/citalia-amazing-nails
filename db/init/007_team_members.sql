-- Personal reservable (team_members) y su horario individual.
-- Desacoplado de roles a propósito: "es técnico reservable" no depende de role_id,
-- así una dueña con role_id='admin' puede tener también su propia agenda.
-- Ver docs/team-permissions-architecture.md (secciones A4 y A8).

-- =========================================================
-- 1. team_members
-- =========================================================
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  employee_code VARCHAR(20) UNIQUE,
  job_title VARCHAR(100),
  color_hex VARCHAR(7),
  hire_date DATE,
  termination_date DATE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 2. team_member_schedules (una fila por día de la semana por técnico)
-- =========================================================
CREATE TABLE team_member_schedules (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo … 6=sábado
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (team_member_id, day_of_week)
);

CREATE INDEX idx_team_member_schedules_member ON team_member_schedules(team_member_id);

-- =========================================================
-- 3. team_member_schedule_slots (franjas horarias por día)
-- =========================================================
CREATE TABLE team_member_schedule_slots (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES team_member_schedules(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX idx_team_member_schedule_slots_schedule ON team_member_schedule_slots(schedule_id);

-- =========================================================
-- 4. team_member_time_off (vacaciones, incapacidades, permisos)
-- =========================================================
CREATE TYPE time_off_type AS ENUM ('vacation', 'sick', 'personal', 'other');

CREATE TABLE team_member_time_off (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type time_off_type NOT NULL DEFAULT 'other',
  reason VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_team_member_time_off_member ON team_member_time_off(team_member_id);
CREATE INDEX idx_team_member_time_off_dates ON team_member_time_off(start_date, end_date);
