interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
}

const statusConfig: Record<StatusBadgeProps['status'], { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-warning/10 text-warning border-warning/20' },
  confirmed: { label: 'Confirmada', className: 'bg-primary/10 text-primary border-primary/20' },
  in_progress: { label: 'En curso', className: 'bg-secondary/10 text-secondary border-secondary/20' },
  completed: { label: 'Completada', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelada', className: 'bg-error/10 text-error border-error/20' },
  no_show: { label: 'No asistió', className: 'bg-muted text-muted-foreground border-border' },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full caption font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
