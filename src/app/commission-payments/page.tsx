import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import CommissionPaymentsInteractive from './components/CommissionPaymentsInteractive';

export const metadata: Metadata = {
  title: 'Pago de Comisiones - Citalia',
  description: 'Filtra, revisa y paga las comisiones generadas por los servicios realizados.',
};

export default function CommissionPaymentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Pago de Comisiones"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Pago de Comisiones', href: '/commission-payments' },
          ]}
        />

        <div className="p-6">
          <CommissionPaymentsInteractive />
        </div>
      </main>
    </div>
  );
}
