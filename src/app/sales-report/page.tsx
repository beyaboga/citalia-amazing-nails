import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import SalesReportInteractive from './components/SalesReportInteractive';

export const metadata: Metadata = {
  title: 'Ventas e Ingresos - Citalia',
  description: 'Ventas por cita: servicios, descuentos, propinas, método de pago y totales cobrados.',
};

export default function SalesReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Ventas e Ingresos"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Ventas e Ingresos', href: '/sales-report' },
          ]}
        />

        <div className="p-6">
          <SalesReportInteractive />
        </div>
      </main>
    </div>
  );
}
