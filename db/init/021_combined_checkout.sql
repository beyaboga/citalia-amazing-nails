-- =========================================================
-- Cobro combinado: un pago y un recibo para varias citas del mismo cliente
-- =========================================================
-- Un cliente con servicios repartidos entre varias técnicas tiene varias citas
-- (una técnica por cita). Este cambio permite cobrarlas juntas: UN recibo con todos
-- los servicios y una sola experiencia de pago.
--
-- Clave: cada cita conserva su propio registro en `payments`, así el trigger de
-- comisiones (018) sigue generando la comisión de cada técnica SIN CAMBIOS. Encima
-- se agrupan con `payment_groups`, que lleva el número de recibo del cobro combinado.
-- El cobro individual (/api/payments) no se toca.

CREATE TABLE payment_groups (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  prefix VARCHAR(20) NOT NULL,
  sequence_number INTEGER NOT NULL,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  void_reason TEXT
);

CREATE INDEX idx_payment_groups_customer ON payment_groups(customer_id);

-- Cada pago del grupo apunta aquí. NULL = cobro individual (comportamiento actual).
ALTER TABLE payments
  ADD COLUMN payment_group_id INTEGER REFERENCES payment_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_payments_group ON payments(payment_group_id);
