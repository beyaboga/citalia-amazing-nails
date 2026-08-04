-- Permiso reducido para que el técnico pueda registrar un cliente nuevo desde
-- la agenda (al agendar una cita), sin darle acceso a la pantalla de listado
-- de clientes ni permitirle editar o eliminar perfiles existentes
-- (eso sigue exigiendo 'customers.manage').

INSERT INTO permissions (key, category, description) VALUES
  ('customers.create', 'clientes', 'Registrar clientes nuevos desde la agenda, sin ver el listado ni editar/eliminar perfiles existentes');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'technician' AND p.key = 'customers.create';
