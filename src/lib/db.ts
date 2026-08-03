import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

// Postgres local (Docker) no tiene certificado SSL configurado; un proveedor
// administrado remoto (Supabase, RDS, etc.) sí lo exige. `pg` no negocia SSL solo
// a partir del connection string, así que se activa explícitamente para todo lo
// que no sea localhost.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '');

export const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}
