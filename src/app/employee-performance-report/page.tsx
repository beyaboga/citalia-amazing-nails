import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import EmployeePerformanceReportInteractive from './components/EmployeePerformanceReportInteractive';

export const metadata: Metadata = {
  title: 'Rendimiento por Empleado - Citalia',
  description: 'Servicios realizados, clientes atendidos, ingresos, comisión, propinas y ticket promedio por empleada.',
};

export default function EmployeePerformanceReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Rendimiento por Empleado"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Rendimiento por Empleado', href: '/employee-performance-report' },
          ]}
        />

        <div className="p-6">
          <EmployeePerformanceReportInteractive />
        </div>
      </main>
    </div>
  );
}
