'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface BookingPolicies {
  minimumAdvanceHours: number;
  maximumAdvanceDays: number;
  cancellationHours: number;
  rescheduleHours: number;
  noShowPenalty: boolean;
  requireDeposit: boolean;
  depositPercentage: number;
}

interface BookingPoliciesSectionProps {
  onSave?: (policies: BookingPolicies) => void;
}

const BookingPoliciesSection = ({ onSave }: BookingPoliciesSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [policies, setPolicies] = useState<BookingPolicies>({
    minimumAdvanceHours: 2,
    maximumAdvanceDays: 30,
    cancellationHours: 24,
    rescheduleHours: 12,
    noShowPenalty: true,
    requireDeposit: false,
    depositPercentage: 20,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setIsHydrated(true);
    const savedPolicies = localStorage.getItem('bookingPolicies');
    if (savedPolicies) {
      setPolicies(JSON.parse(savedPolicies));
    }
  }, []);

  const handleChange = (field: keyof BookingPolicies, value: number | boolean) => {
    setPolicies({ ...policies, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (isHydrated) {
      localStorage.setItem('bookingPolicies', JSON.stringify(policies));
    }
    
    if (onSave) {
      onSave(policies);
    }
    
    setIsSaving(false);
    setSaveMessage('Políticas guardadas exitosamente');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleReset = () => {
    const defaultPolicies: BookingPolicies = {
      minimumAdvanceHours: 2,
      maximumAdvanceDays: 30,
      cancellationHours: 24,
      rescheduleHours: 12,
      noShowPenalty: true,
      requireDeposit: false,
      depositPercentage: 20,
    };
    setPolicies(defaultPolicies);
    setSaveMessage('Políticas restablecidas a valores predeterminados');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
            Políticas de Reserva
          </h2>
          <p className="caption text-muted-foreground">
            Configure las reglas para citas, cancelaciones y modificaciones
          </p>
        </div>
        <Icon name="DocumentTextIcon" size={24} className="text-primary" />
      </div>

      <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tiempo mínimo de anticipación (horas)
            </label>
            <input
              type="number"
              min="0"
              value={policies.minimumAdvanceHours}
              onChange={(e) => handleChange('minimumAdvanceHours', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="caption text-muted-foreground mt-1">
              Tiempo mínimo requerido antes de una cita
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tiempo máximo de anticipación (días)
            </label>
            <input
              type="number"
              min="1"
              value={policies.maximumAdvanceDays}
              onChange={(e) => handleChange('maximumAdvanceDays', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="caption text-muted-foreground mt-1">
              Cuántos días adelante se pueden agendar citas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tiempo para cancelación sin cargo (horas)
            </label>
            <input
              type="number"
              min="0"
              value={policies.cancellationHours}
              onChange={(e) => handleChange('cancellationHours', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="caption text-muted-foreground mt-1">
              Tiempo antes de la cita para cancelar sin penalización
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tiempo para reagendar (horas)
            </label>
            <input
              type="number"
              min="0"
              value={policies.rescheduleHours}
              onChange={(e) => handleChange('rescheduleHours', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="caption text-muted-foreground mt-1">
              Tiempo mínimo antes de la cita para reagendar
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
            <div className="flex-1">
              <h3 className="font-medium text-foreground mb-1">
                Penalización por no asistir
              </h3>
              <p className="caption text-muted-foreground">
                Aplicar penalización a clientes que no asisten sin cancelar
              </p>
            </div>
            <button
              onClick={() => handleChange('noShowPenalty', !policies.noShowPenalty)}
              className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                policies.noShowPenalty ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              aria-label="Toggle no-show penalty"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                  policies.noShowPenalty ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
            <div className="flex-1">
              <h3 className="font-medium text-foreground mb-1">
                Requerir depósito
              </h3>
              <p className="caption text-muted-foreground">
                Solicitar depósito al momento de agendar cita
              </p>
            </div>
            <button
              onClick={() => handleChange('requireDeposit', !policies.requireDeposit)}
              className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                policies.requireDeposit ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              aria-label="Toggle deposit requirement"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                  policies.requireDeposit ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {policies.requireDeposit && (
            <div className="ml-4 p-4 border border-border rounded-lg bg-muted/30">
              <label className="block text-sm font-medium text-foreground mb-2">
                Porcentaje de depósito (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={policies.depositPercentage}
                onChange={(e) => handleChange('depositPercentage', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="caption text-muted-foreground mt-1">
                Porcentaje del total del servicio requerido como depósito
              </p>
            </div>
          )}
        </div>
      </div>

      {saveMessage && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success" />
          <span className="text-sm text-success font-medium">{saveMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-muted-foreground focus:ring-offset-2"
        >
          Restablecer
        </button>
      </div>
    </div>
  );
};

export default BookingPoliciesSection;