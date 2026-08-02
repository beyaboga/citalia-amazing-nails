import crypto from 'crypto';
import { cookies } from 'next/headers';
import { pool } from './db';
import { SESSION_COOKIE } from './session-cookie';

export { SESSION_COOKIE };
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 horas

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta SESSION_SECRET en las variables de entorno');
  }
  return secret;
}

/**
 * Token de sesión firmado: `userId.expiraEn.firma`.
 * La firma HMAC impide que alguien edite la cookie para hacerse pasar por otro
 * usuario — sin la clave del servidor no puede generar una firma válida.
 */
export function createSessionToken(userId: number): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userIdRaw, expiresAtRaw, signature] = parts;
  const payload = `${userIdRaw}.${expiresAtRaw}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');

  // timingSafeEqual evita filtrar información por el tiempo de comparación.
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const userId = Number(userIdRaw);
  return Number.isInteger(userId) ? userId : null;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleSlug: string;
  roleName: string;
  teamMemberId: number | null;
  permissions: string[];
}

/**
 * Permisos efectivos = los del rol, más las excepciones `grant`,
 * menos las excepciones `revoke` del usuario.
 */
async function loadUser(userId: number): Promise<SessionUser | null> {
  const { rows } = await pool.query(
    `SELECT
       u.id, u.name, u.email, u.role_id AS "roleId",
       r.slug AS "roleSlug", r.name AS "roleName",
       tm.id AS "teamMemberId"
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN team_members tm ON tm.user_id = u.id
     WHERE u.id = $1
       AND u.is_active
       AND (u.termination_date IS NULL OR u.termination_date >= CURRENT_DATE)`,
    [userId]
  );

  if (rows.length === 0) return null;

  const { rows: permissionRows } = await pool.query(
    `SELECT p.key
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = $2
     WHERE NOT EXISTS (
       SELECT 1 FROM user_permission_overrides o
       WHERE o.user_id = $1 AND o.permission_id = p.id AND o.effect = 'revoke'
     )
     UNION
     SELECT p.key
     FROM permissions p
     JOIN user_permission_overrides o
       ON o.permission_id = p.id AND o.user_id = $1 AND o.effect = 'grant'`,
    [userId, rows[0].roleId]
  );

  return { ...rows[0], permissions: permissionRows.map((r) => r.key) };
}

/** Lee la sesión de la cookie. Devuelve null si no hay sesión válida. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verifySessionToken(token);
  if (userId === null) return null;

  return loadUser(userId);
}

export function hasPermission(user: SessionUser, key: string): boolean {
  return user.permissions.includes(key);
}

/**
 * Atajo para endpoints: exige sesión válida y un permiso concreto.
 * Devuelve el usuario, o un error listo para responder ({ error, status }).
 * Así cada ruta protegida se reduce a dos líneas y responde 401/403 de forma uniforme.
 */
export async function requirePermission(
  key: string
): Promise<{ user: SessionUser } | { error: string; status: 401 | 403 }> {
  const user = await getSession();
  if (!user) return { error: 'No autenticado', status: 401 };
  if (!hasPermission(user, key)) {
    return { error: 'No tiene permiso para realizar esta acción', status: 403 };
  }
  return { user };
}

/**
 * Punto único donde se decide de qué técnico puede ver o tocar citas un usuario.
 * Quien no tenga `appointments.manage.any` queda limitado a su propia agenda,
 * sin importar qué id venga en la petición.
 *
 * Devuelve el id de técnico al que limitar la consulta, o null = sin límite.
 */
export function resolveTechnicianScope(
  user: SessionUser,
  requestedTechnicianId?: number | null
): { technicianId: number | null; forced: boolean } {
  if (hasPermission(user, 'appointments.manage.any') || hasPermission(user, 'appointments.view.any')) {
    return { technicianId: requestedTechnicianId ?? null, forced: false };
  }
  return { technicianId: user.id, forced: true };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};
