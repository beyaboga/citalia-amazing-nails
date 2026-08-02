-- Catálogo de métodos de contacto para preferencias de comunicación del cliente.
-- Los clientes guardan los nombres elegidos directamente en customers.preferred_contact_methods (TEXT[]),
-- no hay llave foránea hacia esta tabla: es solo un catálogo para poblar el selector y poder agregar más.

CREATE TABLE communication_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(100)
);

INSERT INTO communication_methods (name, icon) VALUES
  ('Teléfono', 'PhoneIcon'),
  ('Correo Electrónico', 'EnvelopeIcon'),
  ('WhatsApp', 'ChatBubbleLeftRightIcon'),
  ('SMS', 'DevicePhoneMobileIcon');
