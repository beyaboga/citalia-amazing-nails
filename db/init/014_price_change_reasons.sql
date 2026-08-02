-- Catálogo de motivos para el cambio manual de precio en una cita.
-- Antes eran opciones fijas en el código; ahora se administran y se pueden ampliar.

CREATE TABLE price_change_reasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Los motivos que ya existían fijos en la interfaz.
INSERT INTO price_change_reasons (name) VALUES
  ('Promoción especial'),
  ('Cliente frecuente'),
  ('Compensación'),
  ('Otro');
