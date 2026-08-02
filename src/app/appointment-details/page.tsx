import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import AppointmentDetailsInteractive from './components/AppointmentDetailsInteractive';

export const metadata: Metadata = {
  title: 'Detalles de Cita - Citalia',
  description: 'Visualiza y gestiona información completa de citas individuales incluyendo datos del cliente, servicios seleccionados, historial de cambios y acciones disponibles para confirmar, completar, reprogramar o cancelar reservas.',
};

export default function AppointmentDetailsPage() {
  const mockAppointmentData = {
    id: "APT-2026-0847",
    status: "confirmed" as const,
    date: "25/01/2026",
    time: "14:30",
    client: {
      name: "María Fernanda López",
      email: "maria.lopez@email.com",
      phone: "+504 9876-5432",
      image: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg",
      alt: "Mujer joven sonriente con cabello castaño largo en blusa blanca sobre fondo claro",
      totalAppointments: 12,
      lastVisit: "18/12/2025"
    },
    services: [
      {
        id: "SRV-001",
        name: "Manicura Clásica",
        category: "Manicura",
        duration: 45,
        price: 250.00
      },
      {
        id: "SRV-005",
        name: "Esmaltado Semipermanente",
        category: "Semipermanente",
        duration: 30,
        price: 350.00
      },
      {
        id: "SRV-012",
        name: "Diseño de Uñas Premium",
        category: "Manicura",
        duration: 60,
        price: 450.00
      }
    ],
    totalAmount: 1050.00,
    notes: "Cliente prefiere colores nude y diseños minimalistas. Alérgica al acetato, usar removedor sin acetona.",
    timeline: [
      {
        id: "TL-001",
        action: "Creada",
        timestamp: "20/01/2026 10:15",
        user: "Ana Martínez (Recepción)",
        details: "Cita creada por solicitud telefónica del cliente"
      },
      {
        id: "TL-002",
        action: "Confirmada",
        timestamp: "20/01/2026 15:30",
        user: "Sistema Automático",
        details: "Cliente confirmó cita mediante enlace de confirmación"
      },
      {
        id: "TL-003",
        action: "Modificada",
        timestamp: "22/01/2026 09:45",
        user: "Ana Martínez (Recepción)",
        details: "Se agregó servicio de diseño premium por solicitud del cliente"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />
      
      <main className="md:ml-[280px] min-h-screen">
        <PageHeader title="Detalles de Cita" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AppointmentDetailsInteractive appointmentData={mockAppointmentData} />
        </div>
      </main>
    </div>
  );
}