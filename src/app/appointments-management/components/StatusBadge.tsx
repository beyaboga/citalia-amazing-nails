import Icon from '@/components/ui/AppIcon';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive';
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: 'Pendiente',
      icon: 'ClockIcon',
      className: 'bg-warning/10 text-warning border-warning/20'
    },
    confirmed: {
      label: 'Confirmada',
      icon: 'CheckCircleIcon',
      className: 'bg-primary/10 text-primary border-primary/20'
    },
    completed: {
      label: 'Completada',
      icon: 'CheckBadgeIcon',
      className: 'bg-success/10 text-success border-success/20'
    },
    cancelled: {
      label: 'Cancelada',
      icon: 'XCircleIcon',
      className: 'bg-error/10 text-error border-error/20'
    },
    inactive: {
      label: 'Inactiva',
      icon: 'MinusCircleIcon',
      className: 'bg-muted text-muted-foreground border-border'
    }
  };

  const config = statusConfig[status];
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${config.className} ${sizeClasses[size]} transition-smooth`}>
      <Icon name={config.icon as any} size={iconSizes[size]} />
      {config.label}
    </span>
  );
};

export default StatusBadge;