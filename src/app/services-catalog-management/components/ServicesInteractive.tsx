'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ServiceCard from './ServiceCard';
import CategoryFilter from './CategoryFilter';
import SearchBar from './SearchBar';
import BulkActionsBar from './BulkActionsBar';
import ConfirmationDialog from './ConfirmationDialog';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import ToastNotification from './ToastNotification';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  isActive: boolean;
  image: string;
  alt: string;
  description: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  count: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

const ServicesInteractive = () => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<Toast>({ message: '', type: 'info', isVisible: false });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    action: () => {},
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [servicesRes, categoriesRes] = await Promise.all([
          fetch('/api/services'),
          fetch('/api/service-categories'),
        ]);

        if (!servicesRes.ok || !categoriesRes.ok) {
          throw new Error('No se pudo cargar el catálogo de servicios');
        }

        const servicesData: Service[] = await servicesRes.json();
        const categoriesData: { id: number; name: string; icon: string | null }[] = await categoriesRes.json();

        setServices(servicesData);
        setFilteredServices(servicesData);
        setCategories(
          categoriesData.map((cat) => ({
            id: cat.name,
            label: cat.name,
            icon: cat.icon || 'Squares2X2Icon',
            count: 0,
          }))
        );
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo de servicios');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      let filtered = services;

      if (activeCategory !== 'all') {
        filtered = filtered.filter((service) => service.category === activeCategory);
      }

      if (searchQuery) {
        filtered = filtered.filter(
          (service) =>
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setFilteredServices(filtered);
    }
  }, [activeCategory, searchQuery, services, isHydrated]);

  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    count: services.filter((s) => s.category === cat.id).length,
  }));

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setSelectedServices([]);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedServices([]);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((serviceId) => serviceId !== id) : [...prev, id]));
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/service-creation?id=${id}`);
    },
    [router]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/services/${id}/duplicate`, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'Error al duplicar el servicio');

        setServices((prev) => [result, ...prev]);
        showToast('Servicio duplicado exitosamente', 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Error al duplicar el servicio', 'error');
      }
    },
    [showToast]
  );

  const handleToggleStatus = useCallback(
    async (id: string) => {
      const service = services.find((s) => s.id === id);
      if (!service) return;

      const nextIsActive = !service.isActive;
      try {
        const response = await fetch(`/api/services/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: nextIsActive }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'Error al actualizar el servicio');

        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: nextIsActive } : s)));
        showToast(`Servicio ${nextIsActive ? 'activado' : 'desactivado'} exitosamente`, 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Error al actualizar el servicio', 'error');
      }
    },
    [services, showToast]
  );

  const handleBulkActivate = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: 'Activar Servicios',
      message: `¿Está seguro que desea activar ${selectedServices.length} ${selectedServices.length === 1 ? 'servicio' : 'servicios'}?`,
      variant: 'info',
      action: async () => {
        const ids = selectedServices;
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/services/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: true }),
            }).then((res) => ({ id, ok: res.ok }))
          )
        );
        const succeededIds = results.filter((r) => r.ok).map((r) => r.id);
        setServices((prev) => prev.map((service) => (succeededIds.includes(service.id) ? { ...service, isActive: true } : service)));
        showToast(
          succeededIds.length === ids.length
            ? `${ids.length} ${ids.length === 1 ? 'servicio activado' : 'servicios activados'}`
            : `Se activaron ${succeededIds.length} de ${ids.length} servicios`,
          succeededIds.length === ids.length ? 'success' : 'error'
        );
        setSelectedServices([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, [selectedServices, showToast]);

  const handleBulkDeactivate = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desactivar Servicios',
      message: `¿Está seguro que desea desactivar ${selectedServices.length} ${selectedServices.length === 1 ? 'servicio' : 'servicios'}?`,
      variant: 'warning',
      action: async () => {
        const ids = selectedServices;
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/services/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            }).then((res) => ({ id, ok: res.ok }))
          )
        );
        const succeededIds = results.filter((r) => r.ok).map((r) => r.id);
        setServices((prev) => prev.map((service) => (succeededIds.includes(service.id) ? { ...service, isActive: false } : service)));
        showToast(
          succeededIds.length === ids.length
            ? `${ids.length} ${ids.length === 1 ? 'servicio desactivado' : 'servicios desactivados'}`
            : `Se desactivaron ${succeededIds.length} de ${ids.length} servicios`,
          succeededIds.length === ids.length ? 'success' : 'error'
        );
        setSelectedServices([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, [selectedServices, showToast]);

  const handleBulkDelete = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Servicios',
      message: `¿Está seguro que desea eliminar ${selectedServices.length} ${selectedServices.length === 1 ? 'servicio' : 'servicios'}? Esta acción no se puede deshacer.`,
      variant: 'danger',
      action: async () => {
        const ids = selectedServices;
        const results = await Promise.all(
          ids.map((id) => fetch(`/api/services/${id}`, { method: 'DELETE' }).then((res) => ({ id, ok: res.ok })))
        );
        const succeededIds = results.filter((r) => r.ok).map((r) => r.id);
        setServices((prev) => prev.filter((service) => !succeededIds.includes(service.id)));
        showToast(
          succeededIds.length === ids.length
            ? `${ids.length} ${ids.length === 1 ? 'servicio eliminado' : 'servicios eliminados'}`
            : `Se eliminaron ${succeededIds.length} de ${ids.length} servicios (algunos están en uso)`,
          succeededIds.length === ids.length ? 'success' : 'error'
        );
        setSelectedServices([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, [selectedServices, showToast]);

  const handleCreateNew = useCallback(() => {
    router.push('/service-creation');
  }, [router]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 bg-muted rounded-lg animate-pulse" />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <SearchBar onSearch={handleSearch} />
          <button
            onClick={handleCreateNew}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-warm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span className="font-medium">Nuevo Servicio</span>
          </button>
        </div>

        <CategoryFilter categories={categoriesWithCounts} activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

        {loadError ? (
          <div className="bg-error/10 border border-error text-error rounded-lg p-4">{loadError}</div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : filteredServices.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No se encontraron servicios' : 'No hay servicios disponibles'}
            description={
              searchQuery
                ? 'Intenta con otros términos de búsqueda o ajusta los filtros' :'Comienza agregando tu primer servicio al catálogo'
            }
            actionLabel={!searchQuery ? 'Crear Primer Servicio' : undefined}
            onAction={!searchQuery ? handleCreateNew : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedServices.includes(service.id)}
                onToggleSelect={handleToggleSelect}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </div>

      <BulkActionsBar
        selectedCount={selectedServices.length}
        onClearSelection={() => setSelectedServices([])}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
      />

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <ToastNotification
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </>
  );
};

export default ServicesInteractive;