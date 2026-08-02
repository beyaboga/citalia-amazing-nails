import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ServicesReportInteractive from './components/ServicesReportInteractive';

export const metadata: Metadata = {
  title: 'Reporte de Servicios - Citalia',
  description: 'Cantidad vendida, precio promedio e ingresos por servicio.',
};

export default function ServicesReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reporte de Servicios"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reporte de Servicios', href: '/services-report' },
          ]}
        />

        <div className="p-6">
          <ServicesReportInteractive />
        </div>
      </main>
    </div>
  );
}
