-- Etiquetas libres para "¿Cómo nos conoció?" — reemplaza el select fijo de un solo valor
-- por un catálogo abierto donde se puede seleccionar varias o escribir una nueva al vuelo.
-- Igual que preferred_contact_methods: los clientes guardan los nombres directamente en
-- customers.referral_tags (TEXT[]), sin llave foránea hacia esta tabla.

CREATE TABLE customer_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO customer_tags (name) VALUES
  ('Redes Sociales'),
  ('Búsqueda en Google'),
  ('Recomendación de Amigo/Familiar'),
  ('Pasó por el Local'),
  ('Publicidad');

ALTER TABLE customers DROP COLUMN referral_source;
ALTER TABLE customers ADD COLUMN referral_tags TEXT[] NOT NULL DEFAULT '{}';
