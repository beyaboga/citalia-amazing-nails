'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  PAYMENT_SCHEME_LABELS,
  PAYMENT_SCHEME_DESCRIPTIONS,
  PAY_FREQUENCY_LABELS,
  CALCULATION_MODE_LABELS,
  schemeHasSalary,
  schemeHasCommission,
  formatLempiras,
  type PaymentScheme,
  type PayFrequency,
  type CommissionType,
  type CalculationBase,
  type CalculationMode,
} from '@/lib/payroll';

export interface CommissionRuleData {
  serviceId: number;
  commissionType: CommissionType;
  value: number;
  calculationBase: CalculationBase;
}

export interface CommissionTierData {
  minAmount: number;
  maxAmount: number | null;
  commissionAmount: number;
}

export interface PaymentData {
  scheme: PaymentScheme;
  monthlySalary: number;
  payFrequency: PayFrequency;
  calculationMode: CalculationMode;
  rules: CommissionRuleData[];
  tiers: CommissionTierData[];
}

interface ServiceLite {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface PaymentSectionProps {
  data: PaymentData;
  onChange: (data: PaymentData) => void;
}

const SCHEMES: PaymentScheme[] = ['FIXED', 'FIXED_PLUS_COMMISSION', 'COMMISSION_ONLY'];

const PaymentSection = ({ data, onChange }: PaymentSectionProps) => {
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        setServices(
          rows
            .filter((s) => s.isActive)
            .map((s) => ({ id: Number(s.id), name: s.name, category: s.category, price: s.price }))
        );
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const ruleFor = (serviceId: number) => data.rules.find((r) => r.serviceId === serviceId);

  const setScheme = (scheme: PaymentScheme) => onChange({ ...data, scheme });

  const upsertRule = (serviceId: number, patch: Partial<CommissionRuleData>) => {
    const existing = ruleFor(serviceId);
    const merged: CommissionRuleData = {
      serviceId,
      commissionType: existing?.commissionType ?? 'percentage',
      value: existing?.value ?? 0,
      calculationBase: existing?.calculationBase ?? 'GROSS',
      ...patch,
    };
    const others = data.rules.filter((r) => r.serviceId !== serviceId);
    // La regla se conserva solo si tiene un valor > 0; volver a 0 la elimina.
    onChange({ ...data, rules: merged.value > 0 ? [...others, merged] : others });
  };

  const setCalculationMode = (calculationMode: CalculationMode) => onChange({ ...data, calculationMode });

  const addTier = () => {
    const last = data.tiers[data.tiers.length - 1];
    const minAmount = last ? (last.maxAmount ?? last.minAmount) + 0.01 : 0;
    onChange({ ...data, tiers: [...data.tiers, { minAmount, maxAmount: null, commissionAmount: 0 }] });
  };

  const updateTier = (index: number, patch: Partial<CommissionTierData>) => {
    const tiers = data.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange({ ...data, tiers });
  };

  const removeTier = (index: number) => {
    onChange({ ...data, tiers: data.tiers.filter((_, i) => i !== index) });
  };

  // Aviso rápido en cliente; la garantía real de no-traslape la da la BD al guardar.
  const sortedTiers = [...data.tiers].sort((a, b) => a.minAmount - b.minAmount);
  const tierWarning = sortedTiers.some((t, i) => {
    if (t.maxAmount !== null && t.maxAmount <= t.minAmount) return true;
    const prev = sortedTiers[i - 1];
    return prev ? t.minAmount <= (prev.maxAmount ?? Infinity) : false;
  });

  const showSalary = schemeHasSalary(data.scheme);
  const showCommissions = schemeHasCommission(data.scheme);
  const showTiers = showCommissions && data.calculationMode === 'TIERED_TOTAL';
  const showServiceTable = showCommissions && data.calculationMode !== 'TIERED_TOTAL';

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm space-y-6">
      <div className="flex items-center gap-2">
        <Icon name="BanknotesIcon" size={20} className="text-primary" />
        <h3 className="font-heading font-semibold text-lg text-foreground">Pago del empleado</h3>
      </div>

      {/* Esquema de pago */}
      <div className="space-y-3">
        <label className="caption text-muted-foreground">Esquema de pago</label>
        <div className="grid grid-cols-1 gap-3">
          {SCHEMES.map((scheme) => {
            const active = data.scheme === scheme;
            return (
              <button
                key={scheme}
                type="button"
                onClick={() => setScheme(scheme)}
                className={`text-left p-4 rounded-lg border transition-smooth focus:outline-none focus:ring-2 focus:ring-primary ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      active ? 'border-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{PAYMENT_SCHEME_LABELS[scheme]}</p>
                    <p className="caption text-muted-foreground text-xs mt-0.5">{PAYMENT_SCHEME_DESCRIPTIONS[scheme]}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frecuencia de pago */}
      <div className="max-w-xs">
        <label className="caption text-muted-foreground block mb-1">Frecuencia de pago</label>
        <select
          value={data.payFrequency}
          onChange={(e) => onChange({ ...data, payFrequency: e.target.value as PayFrequency })}
          className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="MONTHLY">{PAY_FREQUENCY_LABELS.MONTHLY}</option>
          <option value="BIWEEKLY">{PAY_FREQUENCY_LABELS.BIWEEKLY}</option>
        </select>
      </div>

      {/* Sueldo mensual */}
      {showSalary && (
        <div className="max-w-xs">
          <label className="caption text-muted-foreground block mb-1">Sueldo mensual</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">L</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={data.monthlySalary || ''}
              onChange={(e) => onChange({ ...data, monthlySalary: Number(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Modo de comisión */}
      {showCommissions && (
        <div className="max-w-sm">
          <label className="caption text-muted-foreground block mb-1">Modo de comisión</label>
          <select
            value={data.calculationMode}
            onChange={(e) => setCalculationMode(e.target.value as CalculationMode)}
            className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="PER_SERVICE">{CALCULATION_MODE_LABELS.PER_SERVICE}</option>
            <option value="TIERED_TOTAL">{CALCULATION_MODE_LABELS.TIERED_TOTAL}</option>
          </select>
        </div>
      )}

      {/* Comisión escalonada por monto total de la cita */}
      {showTiers && (
        <div className="space-y-3">
          <div>
            <label className="caption text-muted-foreground">Rangos de comisión</label>
            <p className="caption text-muted-foreground text-xs mt-0.5">
              La comisión se calcula sobre el total de la cita (ya con descuentos aplicados). Deja "Hasta" vacío en el último rango para "sin límite".
            </p>
          </div>

          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Desde</th>
                  <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Hasta</th>
                  <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Comisión</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.tiers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center caption text-muted-foreground">
                      Sin rangos configurados.
                    </td>
                  </tr>
                ) : (
                  data.tiers.map((tier, index) => (
                    <tr key={index} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">L</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={tier.minAmount}
                            onChange={(e) => updateTier(index, { minAmount: Number(e.target.value) || 0 })}
                            className="w-full h-9 pl-5 pr-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">L</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={tier.maxAmount ?? ''}
                            placeholder="Sin límite"
                            onChange={(e) =>
                              updateTier(index, { maxAmount: e.target.value === '' ? null : Number(e.target.value) })
                            }
                            className="w-full h-9 pl-5 pr-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">L</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={tier.commissionAmount}
                            onChange={(e) => updateTier(index, { commissionAmount: Number(e.target.value) || 0 })}
                            className="w-full h-9 pl-5 pr-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-error transition-smooth"
                          aria-label="Eliminar rango"
                        >
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {tierWarning && (
            <p className="caption text-error text-xs">Hay rangos traslapados o inválidos — corrígelos antes de guardar.</p>
          )}

          <button
            type="button"
            onClick={addTier}
            className="h-10 px-4 bg-background border border-border text-foreground rounded-lg font-medium text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth flex items-center gap-2"
          >
            <Icon name="PlusIcon" size={16} /> Agregar rango
          </button>
        </div>
      )}

      {/* Comisiones por servicio */}
      {showServiceTable && (
        <div className="space-y-3">
          <div>
            <label className="caption text-muted-foreground">Comisión por servicio</label>
            <p className="caption text-muted-foreground text-xs mt-0.5">
              Configura cada servicio de forma individual. La configuración pertenece a este empleado.
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground">
              <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
            </div>
          ) : services.length === 0 ? (
            <p className="caption text-muted-foreground p-4">No hay servicios activos en el catálogo.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Servicio</th>
                    <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-2.5 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {services.map((service) => {
                    const rule = ruleFor(service.id);
                    const type: CommissionType = rule?.commissionType ?? 'percentage';
                    const base: CalculationBase = rule?.calculationBase ?? 'GROSS';
                    return (
                      <tr key={service.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="caption text-muted-foreground text-xs">
                            {service.category} · {formatLempiras(service.price)}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={type}
                            onChange={(e) => upsertRule(service.id, { commissionType: e.target.value as CommissionType })}
                            className="h-9 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="percentage">Porcentaje</option>
                            <option value="fixed_amount">Valor fijo</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="relative w-28">
                            {type === 'fixed_amount' && (
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">L</span>
                            )}
                            <input
                              type="number"
                              min={0}
                              step={type === 'percentage' ? '0.1' : '0.01'}
                              value={rule?.value ?? ''}
                              onChange={(e) => upsertRule(service.id, { value: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className={`w-full h-9 ${type === 'fixed_amount' ? 'pl-5' : 'pl-2'} pr-6 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
                            />
                            {type === 'percentage' && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {type === 'percentage' ? (
                            <select
                              value={base}
                              onChange={(e) => upsertRule(service.id, { calculationBase: e.target.value as CalculationBase })}
                              className="h-9 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="GROSS">Precio total</option>
                              <option value="NET">Precio sin impuestos</option>
                            </select>
                          ) : (
                            <span className="caption text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
