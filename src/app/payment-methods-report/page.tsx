import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import PaymentMethodsReportInteractive from './components/PaymentMethodsReportInteractive';

export const metadata: Metadata = {
  title: 'Reporte de Métodos de Pago - Citalia',
  description: 'Cantidad de transacciones y total recibido por método de pago.',
};

export default function PaymentMethodsReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reporte de Métodos de Pago"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Métodos de Pago', href: '/payment-methods-report' },
          ]}
        />

        <div className="p-6">
          <PaymentMethodsReportInteractive />
        </div>
      </main>
    </div>
  );
}
