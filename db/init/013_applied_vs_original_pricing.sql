-- Separación explícita entre precio ORIGINAL (catálogo) y precio APLICADO (cita),
-- y descuentos con tipo CODE | MANUAL.
--
-- Problema que corrige: appointment_services solo guardaba price_at_booking (el
-- aplicado). Sin el original no se podía mostrar "L500 → L450" ni conservar el
-- precio aplicado al reeditar la cita.

-- 1. Precio original del catálogo en cada línea de la cita.
ALTER TABLE appointment_services ADD COLUMN original_price NUMERIC(10, 2);

-- Para las citas ya existentes: si hubo un cambio de precio registrado, el original
-- está en el historial; si no, se usa el precio actual del catálogo como aproximación.
UPDATE appointment_services aps
SET original_price = COALESCE(
  (SELECT h.original_price
     FROM appointment_price_history h
    WHERE h.appointment_service_id = aps.id
    ORDER BY h.id ASC
    LIMIT 1),
  s.price
)
FROM services s
WHERE s.id = aps.service_id;

ALTER TABLE appointment_services ALTER COLUMN original_price SET NOT NULL;
ALTER TABLE appointment_services
  ADD CONSTRAINT appointment_services_prices_non_negative
  CHECK (price_at_booking >= 0 AND original_price >= 0);

-- 2. Descuentos por cita: distinguir código vs ajuste manual, con motivo.
--    `discount_type` pasa a ser CODE|MANUAL; el tipo de valor (porcentaje o monto
--    fijo) se conserva en `value_type`.
ALTER TABLE appointment_discounts RENAME COLUMN discount_type TO value_type;
ALTER TABLE appointment_discounts RENAME COLUMN subtotal_before_discount TO original_total;
ALTER TABLE appointment_discounts RENAME COLUMN total_after_discount TO final_total;

ALTER TABLE appointment_discounts
  ADD COLUMN discount_type VARCHAR(10) NOT NULL DEFAULT 'CODE'
    CHECK (discount_type IN ('CODE', 'MANUAL')),
  ADD COLUMN discount_name VARCHAR(150),
  ADD COLUMN reason TEXT;

-- Un ajuste manual no tiene código asociado.
ALTER TABLE appointment_discounts ALTER COLUMN discount_code DROP NOT NULL;
ALTER TABLE appointment_discounts ALTER COLUMN value_type DROP NOT NULL;

-- Un descuento nunca puede dejar el total en negativo ni superar el original.
ALTER TABLE appointment_discounts
  ADD CONSTRAINT appointment_discounts_amount_valid
  CHECK (discount_amount >= 0 AND final_total >= 0 AND discount_amount <= original_total);

-- Una cita puede tener a la vez un descuento por código y un ajuste manual,
-- pero no dos del mismo tipo.
ALTER TABLE appointment_discounts DROP CONSTRAINT appointment_discounts_appointment_id_key;
ALTER TABLE appointment_discounts
  ADD CONSTRAINT appointment_discounts_one_per_type UNIQUE (appointment_id, discount_type);
