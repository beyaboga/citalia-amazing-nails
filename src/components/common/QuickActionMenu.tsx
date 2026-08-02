'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface QuickAction {
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
}

interface QuickActionMenuProps {
  context?: 'dashboard' | 'appointments' | 'services';
  actions?: QuickAction[];
  position?: 'header' | 'floating';
  className?: string;
}

const QuickActionMenu = ({ 
  context = 'dashboard', 
  actions: customActions,
  position = 'header',
  className = '' 
}: QuickActionMenuProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const defaultActions: Record<string, QuickAction[]> = {
    dashboard: [
      {
        label: 'Nueva Cita',
        icon: 'PlusIcon',
        href: '/new-appointment-creation',
        variant: 'primary'
      },
      {
        label: 'Nuevo Servicio',
        icon: 'SparklesIcon',
        href: '/service-creation',
        variant: 'secondary'
      }
    ],
    appointments: [
      {
        label: 'Nueva Cita',
        icon: 'PlusIcon',
        href: '/new-appointment-creation',
        variant: 'primary'
      }
    ],
    services: [
      {
        label: 'Nuevo Servicio',
        icon: 'PlusIcon',
        href: '/service-creation',
        variant: 'primary'
      }
    ]
  };

  const actions = customActions || defaultActions[context] || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
    setIsOpen(false);
  };

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-warm';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-warm';
      case 'accent':
        return 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-warm';
      default:
        return 'bg-card text-foreground hover:bg-muted border border-border';
    }
  };

  if (position === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`} ref={menuRef}>
        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 w-56 bg-card rounded-lg shadow-warm-lg border border-border overflow-hidden">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-smooth focus:outline-none focus:bg-muted"
              >
                <Icon name={action.icon as any} size={20} className="text-muted-foreground" />
                <span className="font-medium text-sm text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        )}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-warm-lg hover:shadow-warm-xl hover:scale-105 transition-smooth flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Quick actions menu"
          aria-expanded={isOpen}
        >
          <Icon name={isOpen ? 'XMarkIcon' : 'PlusIcon'} size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => handleActionClick(action)}
          className={`
            hidden md:flex items-center gap-2 px-6 h-12 rounded-lg
            font-medium text-sm transition-smooth
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            ${getVariantStyles(action.variant)}
          `}
        >
          <Icon name={action.icon as any} size={18} />
          <span>{action.label}</span>
        </button>
      ))}

      <div className="md:hidden relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Quick actions menu"
          aria-expanded={isOpen}
        >
          <Icon name="PlusIcon" size={20} />
        </button>

        {isOpen && (
          <div className="absolute top-12 right-0 w-56 bg-card rounded-lg shadow-warm-lg border border-border overflow-hidden z-60">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-smooth focus:outline-none focus:bg-muted"
              >
                <Icon name={action.icon as any} size={20} className="text-muted-foreground" />
                <span className="font-medium text-sm text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickActionMenu;