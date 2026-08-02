import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

const PUBLIC_PATHS = ['/login-authentication', '/api/auth/login'];

/**
 * Primera barrera: si no hay cookie de sesión, no se entra.
 *
 * Aquí solo se comprueba que la cookie exista — el middleware corre en el runtime
 * Edge, donde no hay acceso a la base ni al módulo `crypto` de Node. La verificación
 * real de la firma y de los permisos ocurre en getSession(), dentro de cada endpoint
 * y cada página. Es decir: esto redirige, no autoriza.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const loginUrl = new URL('/login-authentication', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|.*\\.png$|.*\\.svg$).*)'],
};
