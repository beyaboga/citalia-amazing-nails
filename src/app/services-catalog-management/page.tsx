import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import QuickActionMenu from '@/components/common/QuickActionMenu';
import ServicesInteractive from './components/ServicesInteractive';

export const metadata: Metadata = {
  title: 'Gestión de Catálogo de Servicios - Citalia',
  description:
    'Administra el catálogo completo de servicios de Amazing Nails incluyendo manicure, pedicure, reforzamiento, semi-permanente y polygel con control de precios, duración y disponibilidad.',
};

export default function ServicesManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Catálogo de Servicios"
          actions={<QuickActionMenu context="services" position="header" />}
        />

        <div className="p-6">
          <ServicesInteractive />
        </div>
      </main>
    </div>
  );
}