interface CustomerStatusBadgeProps {
  status: 'active' | 'inactive' | 'vip';
}

const CustomerStatusBadge = ({ status }: CustomerStatusBadgeProps) => {
  const statusConfig = {
    active: {
      label: 'Activo',
      className: 'bg-success/10 text-success border-success/20'
    },
    inactive: {
      label: 'Inactivo',
      className: 'bg-muted text-muted-foreground border-border'
    },
    vip: {
      label: 'VIP',
      className: 'bg-accent/20 text-accent-foreground border-accent/30'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full caption font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

export default CustomerStatusBadge;