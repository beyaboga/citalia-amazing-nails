import { Suspense } from 'react';
import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import CustomerFollowupInteractive from './components/CustomerFollowupInteractive';

export const metadata: Metadata = {
  title: 'Seguimiento de Clientes - Citalia',
  description: 'Identifica cuándo un cliente probablemente necesita regresar, por categoría de servicio.',
};

export default function CustomerFollowupPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Seguimiento de Clientes"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Seguimiento de Clientes', href: '/customer-followup' },
          ]}
        />

        <div className="p-6">
          <Suspense fallback={<div className="h-96 bg-card rounded-lg border border-border animate-pulse" />}>
            <CustomerFollowupInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
