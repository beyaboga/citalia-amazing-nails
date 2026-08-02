import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import AppointmentsCalendarInteractive from './components/AppointmentsCalendarInteractive';

export const metadata: Metadata = {
  title: 'Agenda - Citalia',
  description:
    'Agenda visual del salón: vistas por día, 3 días y semana, con columnas por técnico, arrastrar y soltar citas, y control de disponibilidad.',
};

export default function AppointmentsCalendarPage() {
  return (
    <>
      <NavigationSidebar />
      <AppointmentsCalendarInteractive />
    </>
  );
}
