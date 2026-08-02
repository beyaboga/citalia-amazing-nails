-- Fecha de finalización a nivel de cuenta: el login la leerá junto con la contraseña
-- para decidir si el acceso sigue vigente (is_active AND (termination_date IS NULL
-- OR termination_date >= CURRENT_DATE)).
--
-- Va en users, no en team_members, porque todo usuario que inicia sesión necesita
-- esta validación — incluidos administradores y recepcionistas que no son personal
-- reservable y por lo tanto no tienen fila en team_members.

ALTER TABLE users ADD COLUMN termination_date DATE;

COMMENT ON COLUMN users.termination_date IS
  'Último día con acceso al sistema. NULL = sin fecha de finalización.';
