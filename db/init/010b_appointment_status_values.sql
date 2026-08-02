-- Estados nuevos del flujo de agenda. Van en su propio archivo porque Postgres no
-- permite usar un valor de enum recién agregado dentro de la misma transacción,
-- y la restricción de exclusión de 010c necesita referenciarlos.

ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'confirmed';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'no_show' AFTER 'cancelled';
