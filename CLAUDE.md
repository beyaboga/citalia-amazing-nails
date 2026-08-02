# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server on port 4028 (also `npm run start` — both map to `next dev`)
npm run build         # production build
npm run type-check    # tsc --noEmit — run this after any change, it's the primary correctness gate
npm run lint           # next lint
npm run lint:fix
npm run format          # prettier --write src/**/*.{ts,tsx,css,md,json}
npm test               # vitest run — pure-function unit tests in src/lib/**/*.test.ts
npm test -- path/to/file.test.ts   # run a single test file
npm run test:watch     # vitest (watch mode)
```

### Database

Postgres runs in Docker (`docker-compose.yml`, container `amazing_nails_db`, db `amazing_nails`, user
`amazing_nails_admin` — credentials in `.env`/`DATABASE_URL`). Schema lives entirely in `db/init/*.sql`,
applied **in numeric filename order** (`001_init.sql`, `002_...`, … `NNN_description.sql`).

**Critical, non-obvious:** `db/init/*.sql` only auto-runs via `docker-entrypoint-initdb.d` when the
Postgres data volume is created fresh. The dev container's volume already exists, so **every new
migration must also be applied manually** to the running container:

```bash
docker exec -i amazing_nails_db psql -U amazing_nails_admin -d amazing_nails < db/init/NNN_description.sql
```

Before any migration that could lose data, or before a risky one-off script, back up first:
`docker exec amazing_nails_db pg_dump -U amazing_nails_admin -d amazing_nails -F c -f /tmp/x.dump`
then `docker cp` it out to `db/backups/`. A daily automated backup already runs via
`scripts/backup-database.ps1` (registered as the Windows Scheduled Task
`AmazingNailsDB_DailyBackup`, keeps 30 days of `db/backups/auto_*.dump`).

## Architecture

**Stack:** Next.js 15 App Router + TypeScript, `pg` (`node-postgres`) talking directly to Postgres —
no ORM. Tailwind CSS. Charts via `recharts`. Excel export via `xlsx` (dynamically imported client-side
to keep it out of the main bundle).

### Route structure

Each feature is a top-level route folder: `src/app/<feature>/page.tsx` (server component, sets
`metadata`, renders `NavigationSidebar` + `PageHeader` + the feature's `*Interactive.tsx`) and
`src/app/<feature>/components/<Feature>Interactive.tsx` (`'use client'`, owns all state/fetching).
API handlers live in the parallel `src/app/api/<feature>/route.ts` tree, one `GET`/`POST`/etc. per
file, always starting with a permission check (see below) before touching the database.

### Auth & permissions

`src/lib/auth.ts`: session-cookie auth, `getSession()` / `requirePermission(key)` (401 if no
session, 403 if the permission is missing — every API route starts with this). Effective
permissions = role's `role_permissions` + per-user `grant`/`revoke` overrides. Permission keys are
seeded per-migration in `db/init/*.sql` (grep `role_permissions` to find what a role currently has —
there is no single source-of-truth permission list file). `resolveTechnicianScope()` is the existing
pattern for "a technician can only see their own data" scoping; it exists but most routes don't use
it yet (reports are currently admin-only via `reports.view`).

### Database migration pattern

Every schema change is a new numbered file in `db/init/`, never an edit to an old one (old
migrations are historical record, not idempotent setup scripts). A migration typically does three
things together: `ALTER TABLE`/`CREATE TABLE`, `CREATE OR REPLACE FUNCTION` for any trigger it
touches, and permission/seed `INSERT`s. Triggers are used heavily for "keep this derived data
correct automatically" rather than computing it in application code — e.g. commissions
(`generate_commissions_for_payment()`) and customer visit statistics
(`recompute_customer_category_stats()`) both fire from `payments`/`appointments` changes, not from
API route code.

### Domain modules (chronological build order — later ones build on earlier ones)

- **Appointments/calendar** (`appointments-calendar`, `appointments-management`) — custom-built
  calendar (not FullCalendar), DB-level double-booking prevention via an `EXCLUDE` constraint
  (`appointments_no_overlap`) on `(technician_id, tsrange(starts_at, ends_at))`, only enforced for
  `pending`/`confirmed`/`in_progress` statuses.
- **Payments** (`appointment-payment/[id]`) — a payment is a step *after* the appointment, never
  edits the appointment. "Pending payment" is always *derived* (a completed appointment with no
  non-voided payment row), never a stored appointment status. Tips are always recorded separately
  from service revenue (`appointment_tips`/`tip_distribution`), never mixed into `payments.subtotal`.
  Receipts get sequential numbers from the singleton `receipt_numbering` table
  (`UPDATE ... RETURNING` pattern serializes concurrent charges).
- **Commissions** (`commission-payments`) — a `commission_scheme` has a `calculation_mode`:
  `PER_SERVICE` (default — `commission_rules` per service/category, percentage or fixed, computed
  per `appointment_service` line) or `TIERED_TOTAL` (flat amount by which bracket the *whole
  appointment's* total falls into, from `commission_tiers`, overlap-protected by a GiST `EXCLUDE`
  constraint). Because of this, `commission_entries` is **polymorphic**: a row references either one
  `appointment_service` (line-level) or one `appointment` directly (`appointment_id`, whole-cita
  tiered commission) — never both (`commission_entries_target_check`). Any new query against
  `commission_entries` that joins to `appointment_services`/`services` must `LEFT JOIN` (not
  `INNER JOIN`), or tiered-total rows silently disappear from the results.
- **Payroll** (`payroll`, `payroll-reports`) — separate from commissions: `employee_payment_configs`
  holds each employee's scheme/salary/`pay_frequency`; `payroll_payments` is the executed-payroll
  ledger (one row per employee per period paid), linked to the `commission_payouts` it settled.
  `employee_advances` are deducted at the next payroll run regardless of when they were given
  (unlike commissions, which are strictly period-windowed). The Nómina screen lets an admin choose
  an arbitrary period (month picker or custom range) and toggle whether to include pending
  commissions in that run at all — declining leaves them untouched for a future run.
- **Expenses/finance** (`expenses`, `finance-reports`) — `cash_movements` is a `VIEW` (not a table)
  unioning `payments`, `expenses`, `payroll_payments`, `employee_advances` into a single ledger; any
  new money-out feature should be added to that view rather than queried separately.
- **Customer follow-up** (`customer-followup`) — recurrence is tracked per `(customer, service
  category)`, not per exact service. `customer_category_statistics` is a recalculated snapshot (not
  history), kept current by triggers on appointment/payment/service changes; the "Actualizar" button
  in the UI calls a bulk recompute for cases the forward-only triggers can't reach (e.g. bulk-loaded
  historical data). Customer segmentation (`src/lib/customerSegments.ts`, used by the customers
  report) deliberately uses each customer's **first qualifying visit date**, not
  `customers.registration_date`, to decide "new" — many customers were bulk-registered on the same
  day the app went live even though they'd been visiting for a year, and `registration_date` alone
  misclassifies them.
- **Reports module** (`*-report` routes + `src/app/api/reports/*`) — every report follows the same
  shape: `src/lib/reportFilters.ts` (`DateRangePreset` + `rangeForPreset()`) and
  `src/components/common/DateRangePresetFilter.tsx` for the period picker,
  `src/components/common/ReportTable.tsx` for a generic sortable/searchable/paginated table (all
  filtering happens server-side by date range; sort/search/pagination are client-side over the
  already-filtered rows — there's no server pagination anywhere in this codebase), and
  `src/lib/exportTable.ts` (`exportCsv`/`exportXlsx`) for "export exactly what's on screen." New
  reports should reuse all four rather than re-implementing filters/export per page.
  `src/app/api/dashboard/route.ts` computes a "previous period of equal length" for
  period-over-period comparisons — when doing date arithmetic on `YYYY-MM-DD` strings server-side,
  always parse via a local-time-safe helper (see `parseLocalDate`/`addDays` in that file), never
  `new Date(dateString)` directly — the plain string constructor parses as UTC while `Date` getters
  read local time, which silently shifts results by a day depending on server timezone.
- **Data migrations** (`scripts/`) — one-off scripts (e.g.
  `scripts/migrate-historical-appointments.js`) that backfill data should support a `--dry-run` mode
  as the default and log a summary of what would change before any `--execute` flag does real
  writes; they should also log their own run to the `data_migrations` audit table.

### Gotchas specific to this codebase

- Postgres enum columns (e.g. `appointments.status`) need `column::text = $param` when comparing
  against a parameterized value from `pg` — casting the *parameter* to `::varchar` instead throws
  `operator does not exist` at query time, not at compile time, so it won't be caught by
  `type-check`.
- `xlsx` is a real runtime dependency (client-side export), not a dev-only tool — don't move it back
  to `devDependencies`.
- No ORM means every query is hand-written SQL via `pool.query()`/`client.query()`; there's no
  schema-drift protection beyond `type-check` (which only checks TypeScript, not that the SQL
  matches the actual DB) — after any migration, sanity-check the affected queries directly against
  the running container.
