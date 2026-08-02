import type { Metadata } from 'next';
import LoginInteractive from './components/LoginInteractive';

export const metadata: Metadata = {
  title: 'Iniciar Sesión - Citalia',
  description: 'Acceda a Citalia para gestionar citas, servicios y la operación de su salón de belleza.',
};

export default function LoginAuthenticationPage() {
  return <LoginInteractive />;
}