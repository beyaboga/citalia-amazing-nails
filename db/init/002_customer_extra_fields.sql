-- Campos adicionales que captura el formulario de creación de clientes
-- (src/app/customer-profile-creation) y que no estaban en el esquema inicial.

ALTER TABLE customers
  ADD COLUMN address TEXT,
  ADD COLUMN allergies TEXT,
  ADD COLUMN special_requirements TEXT,
  ADD COLUMN referral_source VARCHAR(50),
  ADD COLUMN emergency_contact VARCHAR(150),
  ADD COLUMN emergency_phone VARCHAR(30);
