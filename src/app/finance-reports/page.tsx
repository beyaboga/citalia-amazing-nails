import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import FinanceReportsInteractive from './components/FinanceReportsInteractive';

export const metadata: Metadata = {
  title: 'Reportes Financieros - Citalia',
  description: 'Ingresos, egresos, utilidad, gastos por categoría y saldo por método de pago.',
};

export default function FinanceReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reportes Financieros"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reportes Financieros', href: '/finance-reports' },
          ]}
        />

        <div className="p-6">
          <FinanceReportsInteractive />
        </div>
      </main>
    </div>
  );
}
