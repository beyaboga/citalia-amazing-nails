'use client';

import { useState, useEffect, Fragment } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_STATUS_EMOJI,
  FOLLOWUP_STATUS_CLASSES,
  followupStatusMessage,
  type CategoryBreakdownRow,
  type FollowupStatus,
} from '@/lib/customerFollowup';

interface Summary {
  name: string;
  phone: string | null;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
}

interface CategoryFollowupSectionProps {
  customerId: number;
}

const money = (n: number) => `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

const CategoryFollowupSection = ({ customerId }: CategoryFollowupSectionProps) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownRow[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${customerId}/followup`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/services').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([followup, services]) => {
        if (followup) {
          setSummary(followup.summary);
          setCategories(followup.categories ?? []);
        }
        setAllServices(Array.isArray(services) ? services : []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [customerId]);

  if (isLoading) {
    return <div className="h-48 bg-card rounded-lg border border-border animate-pulse" />;
  }

  if (!summary || categories.length === 0) {
    return null; // Sin historial calificado aún: no hay nada que mostrar todavía.
  }

  const catalogServicesFor = (categoryName: string) =>
    allServices.filter((s) => s.category === categoryName).map((s) => s.name);

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-4">
        <Icon name="ArrowPathIcon" size={22} className="text-primary" />
        <h2 className="font-heading text-xl font-semibold text-foreground">Seguimiento por Categoría</h2>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="caption text-xs text-muted-foreground">Visitas totales</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{summary.totalVisits}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="caption text-xs text-muted-foreground">Total gastado</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{money(summary.totalSpent)}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 col-span-2 sm:col-span-2">
          <p className="caption text-xs text-muted-foreground">Última visita</p>
          <p className="text-lg font-semibold text-foreground">{summary.lastVisitDate ?? '—'}</p>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Categoría</th>
              <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Visitas</th>
              <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Promedio</th>
              <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Próxima visita</th>
              <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((cat) => {
              const st = cat.status as FollowupStatus;
              const isOpen = expanded === cat.categoryId;
              return (
                <Fragment key={cat.categoryId}>
                  <tr
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : cat.categoryId)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Icon name={isOpen ? 'ChevronDownIcon' : 'ChevronRightIcon'} size={14} className="text-muted-foreground" />
                        <span className="font-medium text-foreground">{cat.categoryName}</span>
                      </div>
                      {cat.services.length > 0 && (
                        <p className="caption text-xs text-muted-foreground mt-0.5 pl-5 truncate max-w-xs">
                          {cat.services.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">{cat.totalVisits}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {cat.averageDays !== null ? `${Math.round(cat.averageDays)} días` : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{cat.estimatedNextVisit ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${FOLLOWUP_STATUS_CLASSES[st]}`}
                        title={followupStatusMessage(st, cat.daysLate)}
                      >
                        {FOLLOWUP_STATUS_EMOJI[st]} {FOLLOWUP_STATUS_LABELS[st]}
                      </span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${cat.categoryId}-detail`} className="bg-muted/10">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="caption font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total gastado en esta categoría</p>
                            <p className="text-foreground font-medium">{money(cat.totalSpent)}</p>
                            {cat.favoriteEmployeeName && (
                              <>
                                <p className="caption font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Empleada frecuente</p>
                                <p className="text-foreground font-medium">{cat.favoriteEmployeeName}</p>
                              </>
                            )}
                          </div>
                          <div>
                            <p className="caption font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Servicios incluidos en "{cat.categoryName}"
                            </p>
                            <ul className="space-y-0.5">
                              {catalogServicesFor(cat.categoryName).map((name) => (
                                <li key={name} className="flex items-center gap-1.5 text-foreground">
                                  <Icon name="CheckCircleIcon" size={13} className="text-success flex-shrink-0" />
                                  {name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryFollowupSection;
