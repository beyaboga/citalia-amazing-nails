-- Ajustes de permisos tras la auditoría del perfil de Recepción.
--
-- Hallazgo 2: el catálogo (servicios y categorías) no tenía ningún permiso, así que
-- cualquier usuario podía cambiar precios y servicios. Se crea `services.manage` y se
-- reserva para admin. La lectura (GET) sigue abierta: todos necesitan ver el catálogo
-- para agendar.
--
-- Hallazgo 3: Recepción no debería ver comisiones ni reportes. Se le quita
-- `reports.view` (era el permiso que mostraba la comisión del técnico en el cobro).

-- 1. Nuevo permiso del catálogo.
INSERT INTO permissions (key, category, description) VALUES
  ('services.manage', 'servicios', 'Crear, editar y eliminar servicios y categorías');

-- Solo admin lo recibe (el seed original de admin fue de una sola vez).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin' AND p.key = 'services.manage';

-- 2. Recepción deja de ver comisiones y reportes.
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE slug = 'receptionist')
  AND permission_id = (SELECT id FROM permissions WHERE key = 'reports.view');
