'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import PasswordRecoveryModal from './PasswordRecoveryModal';
import LoginBranding from './LoginBranding';
import BrandLogo from '@/components/ui/BrandLogo';

const LoginInteractive = () => {
  const router = useRouter();
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  const handleLogin = async (email: string, password: string, rememberMe: boolean): Promise<void> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'No se pudo iniciar sesión');
    }

    // La sesión vive en una cookie httpOnly que pone el servidor; el navegador
    // no guarda nada del usuario.
    router.push('/main-dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="hidden lg:block">
          <LoginBranding />
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-card rounded-xl shadow-warm-lg border border-border p-8">
            <div className="lg:hidden mb-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card shadow-warm mb-4">
                  <BrandLogo size={44} />
                </div>
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  Citalia
                </h1>
                <p className="caption text-muted-foreground">
                  Agenda. Administra. Crece.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Iniciar Sesión
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ingrese sus credenciales para acceder al sistema
                </p>
              </div>

              <LoginForm onSubmit={handleLogin} />

              <div className="text-center">
                <button
                  onClick={() => setIsRecoveryModalOpen(true)}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth focus:outline-none focus:underline"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>

            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="caption text-xs text-muted-foreground">
              © {new Date().getFullYear()} Citalia. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>

      <PasswordRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
      />
    </div>
  );
};

export default LoginInteractive;