import Icon from '@/components/ui/AppIcon';

interface AppointmentHeaderProps {
  appointmentId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive';
  date: string;
  time: string;
}

const AppointmentHeader = ({ appointmentId, status, date, time }: AppointmentHeaderProps) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        bg: 'bg-warning/10',
        text: 'text-warning',
        label: 'Pendiente',
        icon: 'ClockIcon'
      },
      confirmed: {
        bg: 'bg-primary/10',
        text: 'text-primary',
        label: 'Confirmada',
        icon: 'CheckCircleIcon'
      },
      completed: {
        bg: 'bg-success/10',
        text: 'text-success',
        label: 'Completada',
        icon: 'CheckBadgeIcon'
      },
      cancelled: {
        bg: 'bg-error/10',
        text: 'text-error',
        label: 'Cancelada',
        icon: 'XCircleIcon'
      },
      inactive: {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        label: 'Inactiva',
        icon: 'MinusCircleIcon'
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Cita #{appointmentId}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              <Icon name={statusConfig.icon as any} size={16} variant="solid" />
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground caption">
            <div className="flex items-center gap-2">
              <Icon name="CalendarIcon" size={16} />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="ClockIcon" size={16} />
              <span>{time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentHeader;