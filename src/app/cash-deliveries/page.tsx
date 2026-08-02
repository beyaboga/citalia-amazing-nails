import { Suspense } from 'react';
import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import CashDeliveriesInteractive from './components/CashDeliveriesInteractive';

export const metadata: Metadata = {
  title: 'Entregas de Caja - Citalia',
  description: 'Registra cuándo una empleada entrega al administrador el dinero de las citas cobradas.',
};

export default function CashDeliveriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Entregas de Caja"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Entregas de Caja', href: '/cash-deliveries' },
          ]}
        />

        <div className="p-6">
          <Suspense fallback={<div className="h-96 bg-card rounded-lg border border-border animate-pulse" />}>
            <CashDeliveriesInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
