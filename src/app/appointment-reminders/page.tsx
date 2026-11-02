import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import AppointmentRemindersInteractive from './components/AppointmentRemindersInteractive';

export const metadata: Metadata = {
  title: 'Recordatorios de Citas - Citalia',
  description: 'Citas del día siguiente, con un botón para avisarle a cada clienta por WhatsApp.',
};

export default function AppointmentRemindersPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Recordatorios de Citas"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Recordatorios de Citas', href: '/appointment-reminders' },
          ]}
        />

        <div className="p-6">
          <AppointmentRemindersInteractive />
        </div>
      </main>
    </div>
  );
}
