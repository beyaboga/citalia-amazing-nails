import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import QuickActionMenu from '@/components/common/QuickActionMenu';
import AppointmentsInteractive from './components/AppointmentsInteractive';

export const metadata: Metadata = {
  title: 'Gestión de Citas - Citalia',
  description: 'Administra todas las citas del salón con filtros avanzados, cambios de estado masivos y programación eficiente de servicios de manicura y pedicura.',
};

export default function AppointmentsManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />
      
      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Gestión de Citas"
          actions={<QuickActionMenu context="appointments" position="header" />}
        />

        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mb-8">
            Administra todas las citas del salón, filtra por fecha y estado, realiza cambios masivos y mantén un control completo de la agenda.
          </p>

          <AppointmentsInteractive />
        </div>
      </main>
    </div>
  );
}