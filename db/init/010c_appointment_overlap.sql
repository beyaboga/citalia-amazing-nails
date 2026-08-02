-- Un técnico no puede tener dos citas que se traslapen.
--
-- Solo aplica a estados que ocupan la agenda: una cita cancelada o marcada como
-- "no asistió" libera el espacio, y una completada ya pasó, así que no bloquean.

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    technician_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (technician_id IS NOT NULL AND status IN ('pending', 'confirmed', 'in_progress'));
