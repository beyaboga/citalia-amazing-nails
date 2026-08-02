-- Roles y permisos: reemplaza el ENUM user_role por un catálogo, y agrega
-- excepciones de permisos por usuario (ej. una recepcionista con acceso a precios
-- que otra recepcionista con el mismo rol no tiene).
-- Ver docs/team-permissions-architecture.md (secciones A2 y A3) para el diseño completo.

-- =========================================================
-- 1. roles (catálogo)
-- =========================================================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 2. permissions (catálogo)
-- =========================================================
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT
);

-- =========================================================
-- 3. role_permissions (permisos por defecto de cada rol)
-- =========================================================
CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- =========================================================
-- 4. user_permission_overrides (excepciones individuales)
-- =========================================================
CREATE TABLE user_permission_overrides (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect VARCHAR(6) NOT NULL CHECK (effect IN ('grant', 'revoke')),
  granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_id)
);

-- =========================================================
-- Datos semilla — roles del sistema
-- =========================================================
INSERT INTO roles (slug, name, description, is_system) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema', true),
  ('receptionist', 'Recepcionista', 'Gestiona citas, clientes y el mostrador', true),
  ('technician', 'Técnico', 'Atiende clientes y gestiona su propia agenda', true);

-- =========================================================
-- Datos semilla — permisos base
-- =========================================================
INSERT INTO permissions (key, category, description) VALUES
  ('appointments.manage.own', 'citas', 'Crear y modificar únicamente las propias citas'),
  ('appointments.manage.any', 'citas', 'Crear y modificar las citas de cualquier técnico'),
  ('appointments.view.any', 'citas', 'Ver las citas de cualquier técnico'),
  ('schedules.manage.own', 'equipo', 'Configurar el propio horario y ausencias'),
  ('schedules.manage.any', 'equipo', 'Configurar el horario y ausencias de cualquier técnico'),
  ('pricing.modify', 'precios', 'Cambiar el precio de un servicio al momento de cobrar'),
  ('discounts.apply', 'precios', 'Aplicar descuentos a una cita'),
  ('promotions.manage', 'precios', 'Crear y editar promociones'),
  ('customers.manage', 'clientes', 'Crear, editar y ver el perfil completo de clientes'),
  ('team.manage', 'equipo', 'Crear, editar y desactivar miembros del equipo'),
  ('settings.manage', 'configuración', 'Editar la configuración general del salón'),
  ('reports.view', 'reportes', 'Ver reportes y estadísticas del negocio');

-- =========================================================
-- Datos semilla — permisos por defecto de cada rol
-- =========================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.slug = 'admin';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'receptionist'
  AND p.key IN (
    'appointments.manage.any', 'appointments.view.any',
    'schedules.manage.any', 'discounts.apply',
    'customers.manage', 'reports.view'
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'technician'
  AND p.key IN ('appointments.manage.own', 'schedules.manage.own');

-- =========================================================
-- Migración de users.role (ENUM) → users.role_id (FK)
-- =========================================================
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);

UPDATE users SET role_id = (
  SELECT r.id FROM roles r
  WHERE r.slug = CASE users.role
    WHEN 'owner' THEN 'admin'
    WHEN 'reception' THEN 'receptionist'
    WHEN 'technician' THEN 'technician'
  END
);

ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE users DROP COLUMN role;
DROP TYPE user_role;

CREATE INDEX idx_users_role_id ON users(role_id);
