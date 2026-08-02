-- Historial de cambios de precio por servicio de una cita (auditoría).
--
-- El precio que se cobra por un servicio en una cita vive en
-- appointment_services.price_at_booking (snapshot, independiente del catálogo).
-- Cuando un administrador lo modifica, aquí queda constancia de quién, cuándo,
-- de cuánto a cuánto y por qué.
--
-- Se guardan appointment_id y service_id además de appointment_service_id porque
-- la línea de servicio puede recrearse al editar la cita; así el historial
-- sobrevive aunque esa fila desaparezca.

CREATE TABLE appointment_price_history (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  appointment_service_id INTEGER REFERENCES appointment_services(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  original_price NUMERIC(10, 2) NOT NULL,
  new_price NUMERIC(10, 2) NOT NULL,
  modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE INDEX idx_appointment_price_history_appointment ON appointment_price_history(appointment_id);
