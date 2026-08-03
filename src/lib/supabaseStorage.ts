/**
 * Cliente de Supabase Storage — SOLO servidor. Usa la llave `service_role`
 * (bypassa RLS), nunca debe importarse desde un componente cliente ni exponerse
 * con prefijo NEXT_PUBLIC_. El bucket es privado; el único acceso es a través de
 * las rutas de API autenticadas que ya existían (ver [[receipts]]).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const RECEIPTS_BUCKET = 'receipts';
