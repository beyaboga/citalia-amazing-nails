import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession, hasPermission } from '@/lib/auth';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import QuickActionMenu from '@/components/common/QuickActionMenu';
import DashboardInteractive from './components/DashboardInteractive';

export const metadata: Metadata = {
  title: 'Dashboard Principal - Citalia',
  description: 'Panel de control principal con métricas en tiempo real, visualización de citas y análisis de servicios para la gestión eficiente del salón.',
};

export default async function MainDashboardPage() {
  // El panel muestra ingresos y métricas del negocio: es información de
  // administración. Quien no pueda ver reportes se dirige a su Agenda.
  const user = await getSession();
  if (!user) redirect('/login-authentication');
  if (!hasPermission(user, 'reports.view')) redirect('/appointments-calendar');

  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />
      
      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Dashboard Principal"
          actions={<QuickActionMenu context="dashboard" position="header" />}
        />

        <div className="p-6">
          <p className="caption text-muted-foreground mb-4">Resumen de operaciones y métricas del salón</p>
          <DashboardInteractive />
        </div>
      </main>
    </div>
  );
}