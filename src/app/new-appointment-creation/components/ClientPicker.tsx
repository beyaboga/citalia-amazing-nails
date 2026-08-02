'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface CustomerOption {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

interface CustomerHistory {
  totalAppointments: number;
  lastVisit: string | null;
  lifetimeValue: number;
}

interface ClientPickerProps {
  customers: CustomerOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  /** Destino de "Registrar cliente nuevo": vuelve aquí con el cliente ya elegido. */
  newCustomerHref: string;
  /** Solo quien puede gestionar clientes ve el enlace para registrar uno nuevo. */
  canCreateCustomer: boolean;
}

const ClientPicker = ({ customers, selectedId, onSelect, newCustomerHref, canCreateCustomer }: ClientPickerProps) => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const selected = customers.find((customer) => customer.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === null) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setIsLoadingHistory(true);
    fetch(`/api/customers/${selectedId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setHistory({
          totalAppointments: data.totalAppointments ?? 0,
          lastVisit: data.lastVisit ?? null,
          lifetimeValue: Number(data.lifetimeValue ?? 0),
        });
      })
      // El historial es información de apoyo: si la petición falla se omite, pero
      // nunca debe tumbar la pantalla de agendar.
      .catch(() => {
        if (!cancelled) setHistory(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const matches = query.trim()
    ? customers
        .filter((customer) =>
          `${customer.name} ${customer.phone ?? ''} ${customer.email ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  return (
    <section className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="UserIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Información del Cliente</h2>
          <p className="caption text-muted-foreground text-sm">Busca un cliente o registra uno nuevo</p>
        </div>
      </div>

      {selected ? (
        <div className="rounded-lg border border-primary bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="UserIcon" size={22} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{selected.name}</p>
                <p className="caption text-xs text-muted-foreground">
                  {selected.phone || 'Sin teléfono'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setQuery('');
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth flex-shrink-0"
            >
              Cambiar
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-primary/20 grid grid-cols-3 gap-3">
            <div>
              <p className="caption text-xs text-muted-foreground">Citas</p>
              <p className="font-semibold text-foreground tabular-nums">
                {isLoadingHistory ? '…' : history?.totalAppointments ?? 0}
              </p>
            </div>
            <div>
              <p className="caption text-xs text-muted-foreground">Última visita</p>
              <p className="font-medium text-foreground text-sm">
                {isLoadingHistory ? '…' : history?.lastVisit ?? '—'}
              </p>
            </div>
            <div>
              <p className="caption text-xs text-muted-foreground">Total gastado</p>
              <p className="font-semibold text-primary tabular-nums">
                L {(history?.lifetimeValue ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, teléfono o correo..."
            className="w-full pl-10 pr-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
          />
          {matches.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-warm-lg overflow-hidden">
              {matches.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onSelect(customer.id);
                    setQuery('');
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted transition-smooth"
                >
                  <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="caption text-xs text-muted-foreground">{customer.phone || '—'}</p>
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="caption text-xs text-muted-foreground">
              {query.trim() && matches.length === 0 ? 'Sin resultados' : 'Escribe para buscar'}
            </p>
            {canCreateCustomer && (
              <a
                href={newCustomerHref}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Icon name="PlusIcon" size={16} />
                Registrar cliente nuevo
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ClientPicker;
