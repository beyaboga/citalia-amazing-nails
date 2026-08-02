/**
 * Nombre de la cookie de sesión, aislado en su propio módulo.
 *
 * El middleware corre en el runtime Edge, donde no existen `crypto` ni `pg`.
 * Si importara esto desde lib/auth.ts arrastraría esas dependencias y fallaría,
 * así que la constante vive aquí, sin nada más.
 */
export const SESSION_COOKIE = 'amazing_nails_session';
