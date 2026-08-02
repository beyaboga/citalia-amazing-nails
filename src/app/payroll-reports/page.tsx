import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import PayrollReportsInteractive from './components/PayrollReportsInteractive';

export const metadata: Metadata = {
  title: 'Reportes de Pago - Citalia',
  description: 'Resumen por empleado: servicios, ventas, comisiones, sueldo y total a pagar.',
};

export default function PayrollReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reportes de Pago"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reportes de Pago', href: '/payroll-reports' },
          ]}
        />

        <div className="p-6">
          <PayrollReportsInteractive />
        </div>
      </main>
    </div>
  );
}
