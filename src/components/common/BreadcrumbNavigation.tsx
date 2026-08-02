'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbNavigationProps {
  customItems?: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbNavigation = ({ customItems, className = '' }: BreadcrumbNavigationProps) => {
  const pathname = usePathname();

  const routeLabels: Record<string, string> = {
    'main-dashboard': 'Dashboard',
    'appointments-management': 'Gestión de Citas',
    'new-appointment-creation': 'Nueva Cita',
    'appointment-details': 'Detalles de Cita',
    'services-catalog-management': 'Catálogo de Servicios',
    'service-categories-management': 'Categorías de Servicios',
    'service-creation': 'Nuevo Servicio',
    'business-settings': 'Configuración',
    'customer-profile-management': 'Gestión de Clientes',
    'customer-profile-creation': 'Crear Cliente',
    'customer-profile-details': 'Perfil del Cliente',
    'appointments-calendar': 'Agenda',
    'discount-codes-management': 'Descuentos',
    'price-change-reasons-management': 'Motivos de Cambio de Precio',
    'team-member-management': 'Gestión de Equipo',
    'team-member-creation': 'Crear Miembro del Equipo',
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
  if (customItems) return customItems;

  const paths = pathname.split('/').filter(Boolean);

  // Inicio siempre apunta al dashboard
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Inicio', href: '/main-dashboard' }];

  let currentPath = '';
  paths.forEach((path) => {
    currentPath += `/${path}`;

    // ✅ Evitar duplicados (ej: /main-dashboard se repite)
    if (breadcrumbs.some(b => b.href === currentPath)) return;

    const label =
      routeLabels[path] ||
      path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    breadcrumbs.push({ label, href: currentPath });
  });

  return breadcrumbs;
};
  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 ${className}`}>
      <ol className="flex items-center gap-2 flex-wrap">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;
          
          return (
            <li key={item.href} className="flex items-center gap-2">
              {!isFirst && (
                <Icon 
                  name="ChevronRightIcon" 
                  size={16} 
                  className="text-muted-foreground flex-shrink-0" 
                />
              )}
              {isLast ? (
                <span 
                  className="caption text-foreground font-medium truncate max-w-[200px] sm:max-w-none"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="caption text-muted-foreground hover:text-primary transition-smooth truncate max-w-[150px] sm:max-w-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default BreadcrumbNavigation;