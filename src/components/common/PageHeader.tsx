'use client';

import type { ReactNode } from 'react';
import BreadcrumbNavigation from './BreadcrumbNavigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbItems?: BreadcrumbItem[];
  leading?: ReactNode;
  actions?: ReactNode;
}

/**
 * Barra de encabezado fija (título + ruta) — mismo tamaño de texto y
 * espaciado en todas las pantallas administrativas. Referencia: el
 * encabezado de Catálogo de Servicios.
 */
const PageHeader = ({ title, breadcrumbItems, leading, actions }: PageHeaderProps) => {
  return (
    <div className="sticky top-0 z-30 bg-card border-b border-border">
      <div className="flex items-center justify-between gap-4 h-20 px-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {leading}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-semibold text-2xl text-foreground mb-1 truncate">
              {title}
            </h1>
            <BreadcrumbNavigation customItems={breadcrumbItems} />
          </div>
        </div>
        {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
