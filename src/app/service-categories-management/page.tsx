import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ServiceCategoriesInteractive from './components/ServiceCategoriesInteractive';

export const metadata: Metadata = {
  title: 'Categorías de Servicios - Citalia',
  description: 'Administra las categorías del catálogo de servicios de Amazing Nails.',
};

export default function ServiceCategoriesManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader title="Categorías de Servicios" />

        <div className="p-6">
          <ServiceCategoriesInteractive />
        </div>
      </main>
    </div>
  );
}
