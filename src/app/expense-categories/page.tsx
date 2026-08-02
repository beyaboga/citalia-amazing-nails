import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ExpenseCategoriesInteractive from './components/ExpenseCategoriesInteractive';

export const metadata: Metadata = {
  title: 'Categorías de Gasto - Citalia',
  description: 'Administra las categorías con las que se clasifican los gastos del negocio.',
};

export default function ExpenseCategoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Categorías de Gasto"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Categorías de Gasto', href: '/expense-categories' },
          ]}
        />

        <div className="p-6">
          <ExpenseCategoriesInteractive />
        </div>
      </main>
    </div>
  );
}
