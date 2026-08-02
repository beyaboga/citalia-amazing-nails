'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ServiceOption {
  id: string;
  name: string;
  category: string;
}
interface CategoryOption {
  id: number;
  name: string;
}
interface CustomerOption {
  id: number;
  name: string;
  phone: string | null;
}

export interface DiscountForm {
  id?: number;
  name: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minimumPurchase: string;
  startDate: string;
  endDate: string;
  maxUses: string;
  isActive: boolean;
  serviceIds: number[];
  categoryIds: number[];
  customerIds: number[];
}

interface DiscountCodeModalProps {
  initial: DiscountForm;
  services: ServiceOption[];
  categories: CategoryOption[];
  customers: CustomerOption[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyToNull = (value: string) => (value.trim() === '' ? undefined : value);

const DiscountCodeModal = ({
  initial,
  services,
  categories,
  customers,
  onClose,
  onSaved,
}: DiscountCodeModalProps) => {
  const isEdit = Boolean(initial.id);
  const [form, setForm] = useState<DiscountForm>(initial);
  const [restrictServices, setRestrictServices] = useState(
    initial.serviceIds.length > 0 || initial.categoryIds.length > 0
  );
  const [restrictCustomers, setRestrictCustomers] = useState(initial.customerIds.length > 0);
  const [customerQuery, setCustomerQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const set = <K extends keyof DiscountForm>(key: K, value: DiscountForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleIn = (key: 'serviceIds' | 'categoryIds' | 'customerIds', id: number) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));

  const selectedCustomers = customers.filter((c) => form.customerIds.includes(c.id));
  const customerMatches = customerQuery.trim()
    ? customers
        .filter(
          (c) =>
            !form.customerIds.includes(c.id) &&
            `${c.name} ${c.phone ?? ''}`.toLowerCase().includes(customerQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleSave = async () => {
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.code.trim()) return setError('El código es obligatorio');
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) return setError('El valor debe ser mayor a 0');
    if (form.discountType === 'percentage' && value > 100) return setError('El porcentaje no puede ser mayor a 100');

    setIsSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: value,
      minimumPurchase: emptyToNull(form.minimumPurchase),
      startDate: emptyToNull(form.startDate),
      endDate: emptyToNull(form.endDate),
      maxUses: emptyToNull(form.maxUses),
      isActive: form.isActive,
      serviceIds: restrictServices ? form.serviceIds : [],
      categoryIds: restrictServices ? form.categoryIds : [],
      customerIds: restrictCustomers ? form.customerIds : [],
    };

    try {
      const response = await fetch(
        isEdit ? `/api/discount-codes/${initial.id}` : '/api/discount-codes',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al guardar el descuento');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el descuento');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card rounded-lg border border-border shadow-warm-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {isEdit ? 'Editar Descuento' : 'Nuevo Descuento'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-smooth" aria-label="Cerrar">
            <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nombre <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Bienvenida"
                className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Código <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="Ej: SOUTH_10"
                className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tipo</label>
              <div className="flex gap-2">
                {(['percentage', 'fixed'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('discountType', type)}
                    className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-smooth ${
                      form.discountType === type
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:border-primary/50'
                    }`}
                  >
                    {type === 'percentage' ? 'Porcentaje' : 'Valor fijo'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Valor <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={(e) => set('discountValue', e.target.value)}
                  className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {form.discountType === 'percentage' ? '%' : 'L'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Monto mínimo</label>
              <input
                type="number"
                min={0}
                value={form.minimumPurchase}
                onChange={(e) => set('minimumPurchase', e.target.value)}
                placeholder="Opcional"
                className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Máx. usos</label>
              <input
                type="number"
                min={0}
                value={form.maxUses}
                onChange={(e) => set('maxUses', e.target.value)}
                placeholder="Ilimitado"
                className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 h-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                  className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">Activo</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className="w-full px-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
          </div>

          {/* Restricción por servicios / categorías */}
          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={restrictServices}
                onChange={(e) => setRestrictServices(e.target.checked)}
                className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">Limitar a servicios o categorías</span>
            </label>
            {restrictServices && (
              <div className="space-y-3 pl-1">
                <div>
                  <p className="caption text-xs text-muted-foreground mb-2">Categorías</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleIn('categoryIds', category.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-smooth ${
                          form.categoryIds.includes(category.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground hover:border-primary/50'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="caption text-xs text-muted-foreground mb-2">Servicios</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleIn('serviceIds', Number(service.id))}
                        className={`text-left px-3 py-1.5 rounded-lg border text-sm transition-smooth ${
                          form.serviceIds.includes(Number(service.id))
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground hover:border-primary/50'
                        }`}
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Restricción por clientes */}
          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={restrictCustomers}
                onChange={(e) => setRestrictCustomers(e.target.checked)}
                className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">Limitar a clientes específicos</span>
            </label>
            {restrictCustomers && (
              <div className="pl-1 space-y-2">
                {selectedCustomers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomers.map((customer) => (
                      <span
                        key={customer.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {customer.name}
                        <button type="button" onClick={() => toggleIn('customerIds', customer.id)}>
                          <Icon name="XMarkIcon" size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full px-4 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                  />
                  {customerMatches.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-warm-lg overflow-hidden">
                      {customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            toggleIn('customerIds', customer.id);
                            setCustomerQuery('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-muted transition-smooth text-sm"
                        >
                          {customer.name} <span className="text-muted-foreground text-xs">{customer.phone ?? ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon name="ExclamationCircleIcon" size={16} className="text-error flex-shrink-0" />
              <span className="text-sm text-error font-medium">{error}</span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-11 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountCodeModal;
