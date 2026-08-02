-- =========================================================
-- Auditoría de migraciones de datos históricos
-- =========================================================
-- Bitácora de corridas de scripts de migración (ej. importación de citas de un
-- sistema anterior). Reutilizable para futuras migraciones, no solo la actual.

CREATE TABLE data_migrations (
  id SERIAL PRIMARY KEY,
  migration_key VARCHAR(60) NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  executed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rows_processed INTEGER NOT NULL DEFAULT 0,
  appointments_created INTEGER NOT NULL DEFAULT 0,
  payments_created INTEGER NOT NULL DEFAULT 0,
  commissions_created INTEGER NOT NULL DEFAULT 0,
  payroll_records_created INTEGER NOT NULL DEFAULT 0,
  customers_created INTEGER NOT NULL DEFAULT 0,
  rows_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
  rows_errored INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);
