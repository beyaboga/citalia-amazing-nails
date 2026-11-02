-- La base corría en UTC: después de las 6 p.m. en Honduras (UTC-6), CURRENT_DATE y los
-- casts timestamptz::date (triggers de fondos de reserva, vista cash_movements, etc.)
-- ya daban el día siguiente. Fijar la zona horaria de la base a Honduras corrige todos
-- esos lugares de una vez. Las conexiones nuevas la toman; las ya abiertas, al reciclarse.
-- Los timestamptz ya guardados no cambian (son instantes absolutos).
ALTER DATABASE postgres SET timezone TO 'America/Tegucigalpa';
