-- =========================================================
-- Reajustar transacciones a la fecha de la cita
-- =========================================================
-- Al registrar citas de meses anteriores, el pago/comisión/recibo queda con la
-- fecha en que se REGISTRÓ en el sistema (created_at = hoy), no con la fecha en
-- que realmente ocurrió la cita. Este script corrige eso: mueve la FECHA de cada
-- transacción a la fecha de la cita, conservando la HORA original (solo cambia
-- el día/mes/año, no el momento del día).
--
-- Es seguro de ejecutar varias veces (idempotente): cada UPDATE solo toca las
-- filas cuya fecha todavía no coincide con la de su cita. Reutilízalo cada vez
-- que termines de registrar histórico.
--
-- No toca: la fecha de la CITA (appointment_date, que ya es correcta), las
-- propinas (appointment_tips ya usa la fecha de la cita) ni cuándo se distribuyó
-- una propina (tip_distribution.distribution_date es la fecha de esa acción, no
-- de la visita).
--
-- Uso:
--   docker exec -i amazing_nails_db psql -U amazing_nails_admin -d amazing_nails \
--     -f scripts/realign_dates_to_appointment.sql

BEGIN;

-- 1. payments.created_at → fecha de su cita
UPDATE payments p
   SET created_at = (a.appointment_date::text || ' ' || to_char(p.created_at, 'HH24:MI:SS.US'))::timestamptz
  FROM appointments a
 WHERE a.id = p.appointment_id
   AND p.created_at::date <> a.appointment_date;

-- 2. payment_details.created_at → sigue a su pago (ya corregido en el paso 1)
UPDATE payment_details pd
   SET created_at = p.created_at
  FROM payments p
 WHERE p.id = pd.payment_id
   AND pd.created_at::date <> p.created_at::date;

-- 3. payment_groups.created_at → fecha de las citas del grupo (todas comparten
--    fecha: el cobro combinado solo agrupa citas del mismo día)
UPDATE payment_groups pg
   SET created_at = (a.appointment_date::text || ' ' || to_char(pg.created_at, 'HH24:MI:SS.US'))::timestamptz
  FROM payments p
  JOIN appointments a ON a.id = p.appointment_id
 WHERE p.payment_group_id = pg.id
   AND pg.created_at::date <> a.appointment_date;

-- 4. commission_entries.calculated_at → fecha de la cita del servicio comisionado
UPDATE commission_entries ce
   SET calculated_at = (a.appointment_date::text || ' ' || to_char(ce.calculated_at, 'HH24:MI:SS.US'))::timestamptz
  FROM appointment_services aps
  JOIN appointments a ON a.id = aps.appointment_id
 WHERE aps.id = ce.appointment_service_id
   AND ce.calculated_at::date <> a.appointment_date;

-- 5. receipts.issued_date → sigue a su pago (ya corregido en el paso 1)
UPDATE receipts r
   SET issued_date = p.created_at
  FROM payments p
 WHERE p.id = r.payment_id
   AND r.issued_date::date <> p.created_at::date;

COMMIT;

-- Verificación: no debe quedar ninguna fila desalineada.
SELECT 'payments pendientes' AS chk, COUNT(*) AS restante
  FROM payments p JOIN appointments a ON a.id = p.appointment_id
 WHERE p.created_at::date <> a.appointment_date
UNION ALL
SELECT 'payment_details pendientes', COUNT(*)
  FROM payment_details pd JOIN payments p ON p.id = pd.payment_id
 WHERE pd.created_at::date <> p.created_at::date
UNION ALL
SELECT 'payment_groups pendientes', COUNT(*)
  FROM payment_groups pg JOIN payments p ON p.payment_group_id = pg.id
  JOIN appointments a ON a.id = p.appointment_id
 WHERE pg.created_at::date <> a.appointment_date
UNION ALL
SELECT 'commission_entries pendientes', COUNT(*)
  FROM commission_entries ce
  JOIN appointment_services aps ON aps.id = ce.appointment_service_id
  JOIN appointments a ON a.id = aps.appointment_id
 WHERE ce.calculated_at::date <> a.appointment_date
UNION ALL
SELECT 'receipts pendientes', COUNT(*)
  FROM receipts r JOIN payments p ON p.id = r.payment_id
 WHERE r.issued_date::date <> p.created_at::date;
