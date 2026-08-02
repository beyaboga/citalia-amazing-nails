import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import AppointmentsReportInteractive from './components/AppointmentsReportInteractive';

export const metadata: Metadata = {
  title: 'Reporte de Citas - Citalia',
  description: 'Agenda por período: completadas, canceladas, no asistió y pendientes.',
};

export default function AppointmentsReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reporte de Citas"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reporte de Citas', href: '/appointments-report' },
          ]}
        />

        <div className="p-6">
          <AppointmentsReportInteractive />
        </div>
      </main>
    </div>
  );
}
