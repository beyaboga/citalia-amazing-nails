'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface NonWorkingDay {
  id: string;
  date: string;
  reason: string;
  type: 'holiday' | 'closure' | 'maintenance';
}

interface NonWorkingDaysSectionProps {
  onSave?: (days: NonWorkingDay[]) => void;
}

const NonWorkingDaysSection = ({ onSave }: NonWorkingDaysSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [nonWorkingDays, setNonWorkingDays] = useState<NonWorkingDay[]>([
    { id: '1', date: '2026-01-01', reason: 'Año Nuevo', type: 'holiday' },
    { id: '2', date: '2026-12-25', reason: 'Navidad', type: 'holiday' },
    { id: '3', date: '2026-09-15', reason: 'Día de la Independencia', type: 'holiday' },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDay, setNewDay] = useState<Omit<NonWorkingDay, 'id'>>({
    date: '',
    reason: '',
    type: 'holiday',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setIsHydrated(true);
    const savedDays = localStorage.getItem('nonWorkingDays');
    if (savedDays) {
      setNonWorkingDays(JSON.parse(savedDays));
    }
  }, []);

  const typeLabels: Record<string, string> = {
    holiday: 'Feriado',
    closure: 'Cierre',
    maintenance: 'Mantenimiento',
  };

  const typeColors: Record<string, string> = {
    holiday: 'bg-accent/10 text-accent-foreground border-accent/20',
    closure: 'bg-error/10 text-error border-error/20',
    maintenance: 'bg-warning/10 text-warning-foreground border-warning/20',
  };

  const handleAddDay = () => {
    if (!newDay.date || !newDay.reason) {
      setSaveMessage('Por favor complete todos los campos');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    const day: NonWorkingDay = {
      id: Date.now().toString(),
      ...newDay,
    };

    const updatedDays = [...nonWorkingDays, day].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setNonWorkingDays(updatedDays);
    setNewDay({ date: '', reason: '', type: 'holiday' });
    setShowAddForm(false);
    setSaveMessage('Día no laborable agregado exitosamente');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleRemoveDay = (id: string) => {
    const updatedDays = nonWorkingDays.filter(day => day.id !== id);
    setNonWorkingDays(updatedDays);
    setSaveMessage('Día no laborable eliminado');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (isHydrated) {
      localStorage.setItem('nonWorkingDays', JSON.stringify(nonWorkingDays));
    }
    
    if (onSave) {
      onSave(nonWorkingDays);
    }
    
    setIsSaving(false);
    setSaveMessage('Días no laborables guardados exitosamente');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const formatDate = (dateString: string) => {
    if (!isHydrated) return dateString;
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-HN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
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
            Días No Laborables
          </h2>
          <p className="caption text-muted-foreground">
            Configure feriados, cierres y días de mantenimiento
          </p>
        </div>
        <Icon name="CalendarDaysIcon" size={24} className="text-primary" />
      </div>

      <div className="space-y-3 mb-6">
        {nonWorkingDays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="CalendarIcon" size={48} className="mx-auto mb-3 opacity-50" />
            <p>No hay días no laborables configurados</p>
          </div>
        ) : (
          nonWorkingDays.map((day) => (
            <div
              key={day.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-background hover:shadow-warm-sm transition-smooth"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-foreground">{formatDate(day.date)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${typeColors[day.type]}`}>
                    {typeLabels[day.type]}
                  </span>
                </div>
                <p className="caption text-muted-foreground">{day.reason}</p>
              </div>
              <button
                onClick={() => handleRemoveDay(day.id)}
                className="p-2 text-error hover:bg-error/10 rounded-md transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
                aria-label="Eliminar día"
              >
                <Icon name="TrashIcon" size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAddForm ? (
        <div className="border border-border rounded-lg p-4 bg-muted/30 mb-4">
          <h3 className="font-medium text-foreground mb-4">Agregar Día No Laborable</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={newDay.date}
                onChange={(e) => setNewDay({ ...newDay, date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Motivo
              </label>
              <input
                type="text"
                value={newDay.reason}
                onChange={(e) => setNewDay({ ...newDay, reason: e.target.value })}
                placeholder="Ej: Día de la Independencia"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tipo
              </label>
              <select
                value={newDay.type}
                onChange={(e) => setNewDay({ ...newDay, type: e.target.value as NonWorkingDay['type'] })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="holiday">Feriado</option>
                <option value="closure">Cierre</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddDay}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Agregar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewDay({ date: '', reason: '', type: 'holiday' });
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-muted-foreground focus:ring-offset-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-smooth flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Icon name="PlusIcon" size={20} />
          <span className="font-medium">Agregar Día No Laborable</span>
        </button>
      )}

      {saveMessage && (
        <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={20} className="text-success" />
          <span className="text-sm text-success font-medium">{saveMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 mt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};

export default NonWorkingDaysSection;