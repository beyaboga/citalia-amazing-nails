import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import CustomersReportInteractive from './components/CustomersReportInteractive';

export const metadata: Metadata = {
  title: 'Reporte de Clientes - Citalia',
  description: 'Visitas, gasto total, favoritos y segmentación (nueva/frecuente/VIP/inactiva) por cliente.',
};

export default function CustomersReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reporte de Clientes"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reporte de Clientes', href: '/customers-report' },
          ]}
        />

        <div className="p-6">
          <CustomersReportInteractive />
        </div>
      </main>
    </div>
  );
}
