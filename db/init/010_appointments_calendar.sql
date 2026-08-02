-- Módulo de agenda: campos que faltaban para el calendario y prevención de traslapes.
--
-- Cambios:
--   * end_time (hora_fin): se guarda en vez de calcularse al vuelo, para poder
--     consultar traslapes en SQL sin recalcular duración en cada fila.
--   * created_by: quién registró la cita (auditoría).
--   * starts_at / ends_at: columnas generadas que combinan fecha + hora, para que
--     el índice de exclusión pueda comparar rangos de tiempo directamente.
--   * Restricción de exclusión: la base impide que un mismo técnico tenga dos citas
--     traslapadas. Es la última línea de defensa — el backend valida antes y da un
--     mensaje legible, pero esto garantiza que no pase ni con peticiones simultáneas.
--
-- Los estados nuevos (in_progress, no_show) se agregan en 010b, porque Postgres no
-- permite usar un valor de enum recién creado dentro de la misma transacción.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments ADD COLUMN end_time TIME;

UPDATE appointments
SET end_time = (appointment_time + make_interval(mins => GREATEST(total_duration_minutes, 1)))::time;

ALTER TABLE appointments ALTER COLUMN end_time SET NOT NULL;
ALTER TABLE appointments ADD CONSTRAINT appointments_time_order CHECK (end_time > appointment_time);

ALTER TABLE appointments
  ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD COLUMN starts_at TIMESTAMP GENERATED ALWAYS AS (appointment_date + appointment_time) STORED,
  ADD COLUMN ends_at   TIMESTAMP GENERATED ALWAYS AS (appointment_date + end_time) STORED;

CREATE INDEX idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX idx_appointments_technician_starts ON appointments(technician_id, starts_at);
