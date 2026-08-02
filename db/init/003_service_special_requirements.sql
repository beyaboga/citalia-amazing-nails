-- Campo adicional que captura el formulario de creación de servicios
-- (src/app/service-creation) y que no estaba en el esquema inicial.

ALTER TABLE services
  ADD COLUMN special_requirements TEXT;
