import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

// Mensaje genérico a propósito: no revela si el correo existe o si solo falló la
// contraseña, para no ayudar a alguien que esté probando correos.
const INVALID_CREDENTIALS = 'Correo electrónico o contraseña incorrectos';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Ingrese su correo y contraseña' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.name, u.password_hash AS "passwordHash",
         u.is_active AS "isActive", u.termination_date AS "terminationDate",
         (u.termination_date IS NOT NULL AND u.termination_date < CURRENT_DATE) AS "isExpired"
       FROM users u
       WHERE lower(u.email) = $1`,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // La contraseña era correcta: aquí sí conviene decir por qué no puede entrar,
    // para que sepa a quién pedirle que le reactive el acceso.
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Su cuenta está desactivada. Contacte al administrador.' },
        { status: 403 }
      );
    }

    if (user.isExpired) {
      return NextResponse.json(
        { error: 'Su acceso al sistema venció. Contacte al administrador.' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ id: user.id, name: user.name });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}
