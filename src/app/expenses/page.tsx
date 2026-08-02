import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ExpensesInteractive from './components/ExpensesInteractive';

export const metadata: Metadata = {
  title: 'Gastos - Citalia',
  description: 'Registra y consulta los gastos del negocio.',
};

export default function ExpensesPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Gastos"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Gastos', href: '/expenses' },
          ]}
        />

        <div className="p-6">
          <ExpensesInteractive />
        </div>
      </main>
    </div>
  );
}
