'use client';

import { useState, useEffect } from 'react';

export interface ClientSession {
  id: number;
  name: string;
  email: string;
  roleSlug: string;
  roleName: string;
  teamMemberId: number | null;
  permissions: string[];
}

/**
 * Sesión del usuario actual para componentes de cliente.
 *
 * Sirve para adaptar la interfaz (ocultar botones, preseleccionar al técnico),
 * NUNCA para autorizar: el servidor vuelve a verificar permisos en cada endpoint.
 */
export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const can = (permission: string) => Boolean(session?.permissions.includes(permission));

  return { session, isLoading, can };
}
