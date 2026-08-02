'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import BrandLogo from '@/components/ui/BrandLogo';
import { useSession } from '@/lib/useSession';


interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  permission?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface NavigationSidebarProps {
  isCollapsed?: boolean;
}

const NavigationSidebar = ({ isCollapsed = false }: NavigationSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session, can } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem('sidebarMobileOpen');
    if (savedState) {
      setIsMobileOpen(JSON.parse(savedState));
    }
    const savedSections = localStorage.getItem('sidebarOpenSections');
    if (savedSections) {
      setOpenSections(new Set(JSON.parse(savedSections)));
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebarMobileOpen', JSON.stringify(isMobileOpen));
    }
  }, [isMobileOpen, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebarOpenSections', JSON.stringify([...openSections]));
    }
  }, [openSections, mounted]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const allNavigationSections: NavigationSection[] = [
    {
      title: 'Operación',
      items: [
        { label: 'Dashboard', href: '/main-dashboard', icon: 'ChartBarIcon', permission: 'reports.view' },
        { label: 'Agenda', href: '/appointments-calendar', icon: 'CalendarDaysIcon' },
        { label: 'Citas', href: '/appointments-management', icon: 'CalendarIcon' },
        { label: 'Reporte de Citas', href: '/appointments-report', icon: 'DocumentChartBarIcon', permission: 'reports.view' },
      ],
    },
    {
      title: 'Clientes',
      items: [
        { label: 'Clientes', href: '/customer-profile-management', icon: 'UserGroupIcon', permission: 'customers.manage' },
        { label: 'Seguimiento de Clientes', href: '/customer-followup', icon: 'ArrowPathIcon', permission: 'customers.manage' },
        { label: 'Reporte de Clientes', href: '/customers-report', icon: 'DocumentChartBarIcon', permission: 'customers.manage' },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { label: 'Servicios', href: '/services-catalog-management', icon: 'SparklesIcon', permission: 'services.manage' },
        { label: 'Categorías', href: '/service-categories-management', icon: 'TagIcon', permission: 'services.manage' },
        { label: 'Descuentos', href: '/discount-codes-management', icon: 'TicketIcon', permission: 'promotions.manage' },
        { label: 'Reporte de Servicios', href: '/services-report', icon: 'DocumentChartBarIcon', permission: 'reports.view' },
      ],
    },
    {
      title: 'Pagos',
      items: [
        { label: 'Recibos', href: '/receipts', icon: 'ReceiptPercentIcon', permission: 'payments.charge' },
        { label: 'Propinas', href: '/tips-distribution', icon: 'SparklesIcon', permission: 'tips.distribute' },
        { label: 'Motivos de Precio', href: '/price-change-reasons-management', icon: 'AdjustmentsHorizontalIcon', permission: 'pricing.modify' },
      ],
    },
    {
      title: 'Nómina y Comisiones',
      items: [
        { label: 'Nómina', href: '/payroll', icon: 'BanknotesIcon', permission: 'payroll.pay' },
        { label: 'Pago de Comisiones', href: '/commission-payments', icon: 'BanknotesIcon', permission: 'commissions.pay' },
        { label: 'Reportes de Pago', href: '/payroll-reports', icon: 'DocumentChartBarIcon', permission: 'payroll.configure' },
        { label: 'Rendimiento por Empleado', href: '/employee-performance-report', icon: 'ChartBarIcon', permission: 'reports.view' },
        { label: 'Impuestos', href: '/tax-settings', icon: 'ReceiptPercentIcon', permission: 'payroll.configure' },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        { label: 'Entregas de Caja', href: '/cash-deliveries', icon: 'BanknotesIcon', permission: 'cash.deliveries.manage' },
        { label: 'Gastos', href: '/expenses', icon: 'BanknotesIcon', permission: 'expenses.register' },
        { label: 'Categorías de Gasto', href: '/expense-categories', icon: 'TagIcon', permission: 'expenses.manage' },
        { label: 'Reportes Financieros', href: '/finance-reports', icon: 'ChartPieIcon', permission: 'finance.reports' },
        { label: 'Ventas e Ingresos', href: '/sales-report', icon: 'ChartBarIcon', permission: 'reports.view' },
        { label: 'Métodos de Pago', href: '/payment-methods-report', icon: 'CreditCardIcon', permission: 'reports.view' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { label: 'Equipo', href: '/team-member-management', icon: 'UsersIcon', permission: 'team.manage' },
        { label: 'Configuración', href: '/business-settings', icon: 'Cog6ToothIcon', permission: 'settings.manage' },
      ],
    },
  ];

  const navigationSections = allNavigationSections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login-authentication');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/main-dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // La sección de la página actual siempre se abre sola, aunque el usuario haya
  // colapsado todo — así nunca se "pierde" de vista dónde está parado.
  useEffect(() => {
    const activeSection = navigationSections.find((section) => section.items.some((item) => isActive(item.href)));
    if (activeSection && !openSections.has(activeSection.title)) {
      setOpenSections((prev) => new Set(prev).add(activeSection.title));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleMobileToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={handleMobileToggle}
        className="md:hidden fixed top-6 left-6 z-50 p-2 rounded-md bg-card shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileOpen}
      >
        <Icon name={isMobileOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} className="text-foreground" />
      </button>

      <aside
        className={`
          fixed top-0 left-0 h-screen bg-card border-r border-border z-40
          transition-smooth
          ${isCollapsed ? 'w-20' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center h-20 px-6 border-b border-border">
            <Link href={can('reports.view') ? '/main-dashboard' : '/appointments-calendar'} className="flex items-center gap-3 group" onClick={handleLinkClick}>
              <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                <BrandLogo size={40} className="w-full h-full" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-heading font-semibold text-lg text-foreground group-hover:text-primary transition-smooth">
                    Citalia
                  </span>
                  <span className="caption text-muted-foreground text-xs">Admin Panel</span>
                </div>
              )}
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-3">
            <div className="space-y-1">
              {navigationSections.map((section) => {
                const sectionOpen = isCollapsed || openSections.has(section.title);
                const sectionHasActive = section.items.some((item) => isActive(item.href));
                return (
                <div key={section.title}>
                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className={`
                        w-full flex items-center justify-between gap-2 px-4 h-9 rounded-lg
                        transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                        ${sectionHasActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                      `}
                      aria-expanded={sectionOpen}
                    >
                      <span className="caption text-xs font-semibold uppercase tracking-wider">
                        {section.title}
                      </span>
                      <Icon
                        name="ChevronDownIcon"
                        size={14}
                        className={`flex-shrink-0 transition-transform ${sectionOpen ? 'rotate-0' : '-rotate-90'}`}
                      />
                    </button>
                  )}
                  {sectionOpen && (
                  <ul className="space-y-1 mb-4">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={handleLinkClick}
                            className={`
                              flex items-center gap-3 px-4 h-12 rounded-lg
                              transition-smooth group relative
                              ${active
                                ? 'bg-primary text-primary-foreground shadow-warm'
                                : 'text-foreground hover:bg-muted hover:text-primary'
                              }
                              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                            `}
                            aria-current={active ? 'page' : undefined}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon
                              name={item.icon as any}
                              size={20}
                              variant={active ? 'solid' : 'outline'}
                              className={`flex-shrink-0 ${active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'} transition-smooth`}
                            />
                            {!isCollapsed && (
                              <span className="font-medium text-[15px]">{item.label}</span>
                            )}
                            {item.badge && item.badge > 0 && !isCollapsed && (
                              <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-accent text-accent-foreground">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  )}
                </div>
                );
              })}
            </div>
          </nav>

          <div className="p-6 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="UserIcon" size={20} className="text-primary" />
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {session?.name ?? '—'}
                    </p>
                    <p className="caption text-xs text-muted-foreground truncate">
                      {session?.roleName ?? ''}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex-shrink-0"
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background z-30"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default NavigationSidebar;