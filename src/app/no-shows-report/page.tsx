import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import NoShowsReportInteractive from './components/NoShowsReportInteractive';

export const metadata: Metadata = {
  title: 'Reporte de Inasistencias - Citalia',
  description: 'Clientas que no asistieron a su cita, con cuánto se dejó de ganar.',
};

export default function NoShowsReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reporte de Inasistencias"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reporte de Inasistencias', href: '/no-shows-report' },
          ]}
        />

        <div className="p-6">
          <NoShowsReportInteractive />
        </div>
      </main>
    </div>
  );
}
