-- =========================================================
-- Nómina: período de liquidación seleccionable + inclusión de comisiones
-- =========================================================
-- Permite al admin elegir libremente el período a liquidar (mes completo o rango
-- personalizado) en vez de que el sistema use siempre el mes/quincena actual, y
-- decidir si esa nómina incluye las comisiones pendientes o las deja para una
-- liquidación futura (sin tocar su estado).
--
-- No se crean tablas nuevas: la trazabilidad de qué comisiones se pagaron en cada
-- nómina ya existe vía payroll_payments.commission_payout_id -> commission_payouts.id
-- <- commission_entries.payout_id.

ALTER TABLE payroll_payments
  ADD COLUMN include_commissions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN is_custom_range BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN period_month SMALLINT CHECK (period_month BETWEEN 1 AND 12),
  ADD COLUMN period_year SMALLINT CHECK (period_year >= 2000);

-- Reconstrucción histórica: todo pago existente fue mes calendario completo o
-- quincena exacta dentro de un único mes, así que el mes de period_start es
-- correcto y sin ambigüedad. Las comisiones ya se incluían siempre en el flujo
-- anterior.
UPDATE payroll_payments
   SET period_month = EXTRACT(MONTH FROM period_start),
       period_year  = EXTRACT(YEAR FROM period_start),
       is_custom_range = false,
       include_commissions = true;
