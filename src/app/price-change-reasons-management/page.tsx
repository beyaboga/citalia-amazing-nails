import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import PriceChangeReasonsInteractive from './components/PriceChangeReasonsInteractive';

export const metadata: Metadata = {
  title: 'Motivos de Cambio de Precio - Citalia',
  description: 'Administra los motivos que se usan al cambiar manualmente el precio de una cita.',
};

export default function PriceChangeReasonsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Motivos de Cambio de Precio"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Motivos de Cambio de Precio', href: '/price-change-reasons-management' },
          ]}
        />

        <div className="p-6">
          <PriceChangeReasonsInteractive />
        </div>
      </main>
    </div>
  );
}
