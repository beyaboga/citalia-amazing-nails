import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import TeamMemberManagementInteractive from './components/TeamMemberManagementInteractive';

export const metadata: Metadata = {
  title: 'Gestión de Equipo - Citalia',
  description: 'Administra las cuentas de acceso, roles y disponibilidad del equipo de Amazing Nails.',
};

export default function TeamMemberManagementPage() {
  return (
    <>
      <NavigationSidebar />
      <TeamMemberManagementInteractive />
    </>
  );
}
