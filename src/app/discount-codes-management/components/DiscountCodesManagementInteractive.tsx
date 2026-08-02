'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import PageHeader from '@/components/common/PageHeader';
import DiscountCodeModal, { type DiscountForm } from './DiscountCodeModal';

interface DiscountRow {
  id: number;
  name: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  expired: boolean;
}

const emptyForm: DiscountForm = {
  name: '',
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minimumPurchase: '',
  startDate: '',
  endDate: '',
  maxUses: '',
  isActive: true,
  serviceIds: [],
  categoryIds: [],
  customerIds: [],
};

const DiscountCodesManagementInteractive = () => {
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalInitial, setModalInitial] = useState<DiscountForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscountRow | null>(null);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/discount-codes');
      if (!res.ok) throw new Error('No se pudieron cargar los descuentos');
      setRows(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
    Promise.all([
      fetch('/api/services').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/service-categories').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/customers').then((r) => (r.ok ? r.json() : [])),
    ]).then(([svc, cat, cus]) => {
      setServices(svc);
      setCategories(cat);
      setCustomers(cus);
    });
  }, [loadRows]);

  const openEdit = async (id: number) => {
    const res = await fetch(`/api/discount-codes/${id}`);
    if (!res.ok) return;
    const d = await res.json();
    setModalInitial({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description ?? '',
      discountType: d.discountType,
      discountValue: String(d.discountValue),
      minimumPurchase: d.minimumPurchase != null ? String(d.minimumPurchase) : '',
      startDate: d.startDate ?? '',
      endDate: d.endDate ?? '',
      maxUses: d.maxUses != null ? String(d.maxUses) : '',
      isActive: d.isActive,
      serviceIds: d.serviceIds ?? [],
      categoryIds: d.categoryIds ?? [],
      customerIds: d.customerIds ?? [],
    });
  };

  // Activar/desactivar conserva las restricciones actuales (el PATCH las reemplaza),
  // por eso primero se carga el detalle completo.
  const toggleActive = async (row: DiscountRow) => {
    const res = await fetch(`/api/discount-codes/${row.id}`);
    if (!res.ok) return;
    const d = await res.json();
    await fetch(`/api/discount-codes/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, isActive: !d.isActive }),
    });
    loadRows();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/discount-codes/${confirmDelete.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    loadRows();
  };

  const statusBadge = (row: DiscountRow) => {
    if (!row.isActive)
      return <span className="px-2.5 py-1 rounded-full caption text-xs bg-muted text-muted-foreground border border-border">Inactivo</span>;
    if (row.expired)
      return <span className="px-2.5 py-1 rounded-full caption text-xs bg-error/10 text-error border border-error/20">Vencido</span>;
    return <span className="px-2.5 py-1 rounded-full caption text-xs bg-success/10 text-success border border-success/20">Activo</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Descuentos"
          actions={
            <button
              onClick={() => setModalInitial(emptyForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="PlusIcon" size={20} />
              <span className="font-medium">Nuevo Descuento</span>
            </button>
          }
        />

        <div className="p-6 max-w-7xl mx-auto space-y-4">
          <p className="text-muted-foreground">Administra los códigos promocionales del salón</p>

          {loadError && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">{loadError}</div>
          )}

          {isLoading ? (
            <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
          ) : rows.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Icon name="TicketIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Aún no hay descuentos</h3>
              <p className="text-muted-foreground">Crea el primer código con el botón de arriba</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left caption font-semibold text-foreground">Código</th>
                      <th className="px-6 py-4 text-left caption font-semibold text-foreground">Descuento</th>
                      <th className="px-6 py-4 text-left caption font-semibold text-foreground">Vigencia</th>
                      <th className="px-6 py-4 text-left caption font-semibold text-foreground">Usos</th>
                      <th className="px-6 py-4 text-left caption font-semibold text-foreground">Estado</th>
                      <th className="px-6 py-4 text-left caption font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-smooth">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-foreground data-text">{row.code}</p>
                          <p className="caption text-xs text-muted-foreground">{row.name}</p>
                        </td>
                        <td className="px-6 py-4 tabular-nums">
                          {row.discountType === 'percentage'
                            ? `${row.discountValue}%`
                            : `L ${row.discountValue.toLocaleString()}`}
                        </td>
                        <td className="px-6 py-4 caption text-sm text-muted-foreground">
                          {row.startDate || row.endDate
                            ? `${row.startDate ?? '…'} → ${row.endDate ?? '…'}`
                            : 'Sin límite'}
                        </td>
                        <td className="px-6 py-4 tabular-nums">
                          {row.currentUses}
                          {row.maxUses != null ? ` / ${row.maxUses}` : ''}
                        </td>
                        <td className="px-6 py-4">{statusBadge(row)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleActive(row)}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                              title={row.isActive ? 'Desactivar' : 'Activar'}
                            >
                              <Icon name={row.isActive ? 'PauseCircleIcon' : 'PlayCircleIcon'} size={18} />
                            </button>
                            <button
                              onClick={() => openEdit(row.id)}
                              className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-smooth"
                              title="Editar"
                            >
                              <Icon name="PencilSquareIcon" size={18} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(row)}
                              className="p-2 rounded-lg hover:bg-error/10 text-error transition-smooth"
                              title="Eliminar"
                            >
                              <Icon name="TrashIcon" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalInitial && (
        <DiscountCodeModal
          initial={modalInitial}
          services={services}
          categories={categories}
          customers={customers}
          onClose={() => setModalInitial(null)}
          onSaved={() => {
            setModalInitial(null);
            loadRows();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Eliminar descuento</h3>
            <p className="text-muted-foreground text-sm mb-6">
              ¿Eliminar el código <span className="font-semibold text-foreground">{confirmDelete.code}</span>? Las citas
              que ya lo usaron conservan su historial.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-11 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                className="flex-1 h-11 bg-error text-white rounded-lg font-medium hover:bg-error/90 transition-smooth"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodesManagementInteractive;
