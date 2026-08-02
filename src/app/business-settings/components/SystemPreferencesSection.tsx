'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SystemPreferences {
  darkMode: boolean;
  language: string;
  currency: string;
  timeFormat: '12h' | '24h';
  dateFormat: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

interface SystemPreferencesSectionProps {
  onSave?: (preferences: SystemPreferences) => void;
}

const SystemPreferencesSection = ({ onSave }: SystemPreferencesSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [preferences, setPreferences] = useState<SystemPreferences>({
    darkMode: false,
    language: 'es',
    currency: 'HNL',
    timeFormat: '12h',
    dateFormat: 'DD/MM/YYYY',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    autoBackup: true,
    backupFrequency: 'weekly',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setIsHydrated(true);
    const savedPreferences = localStorage.getItem('systemPreferences');
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (preferences.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [preferences.darkMode, isHydrated]);

  const handleToggle = (field: keyof SystemPreferences) => {
    setPreferences({ ...preferences, [field]: !preferences[field] });
  };

  const handleNotificationToggle = (type: keyof SystemPreferences['notifications']) => {
    setPreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [type]: !preferences.notifications[type],
      },
    });
  };

  const handleChange = (field: keyof SystemPreferences, value: string) => {
    setPreferences({ ...preferences, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (isHydrated) {
      localStorage.setItem('systemPreferences', JSON.stringify(preferences));
    }
    
    if (onSave) {
      onSave(preferences);
    }
    
    setIsSaving(false);
    setSaveMessage('Preferencias guardadas exitosamente');
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
            Preferencias del Sistema
          </h2>
          <p className="caption text-muted-foreground">
            Configure la apariencia y comportamiento de la aplicación
          </p>
        </div>
        <Icon name="Cog6ToothIcon" size={24} className="text-primary" />
      </div>

      <div className="space-y-6 mb-6">
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Apariencia</h3>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-3">
              <Icon name={preferences.darkMode ? 'MoonIcon' : 'SunIcon'} size={20} className="text-muted-foreground" />
              <div>
                <h4 className="font-medium text-foreground">Modo Oscuro</h4>
                <p className="caption text-muted-foreground">
                  Cambiar entre tema claro y oscuro
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('darkMode')}
              className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                preferences.darkMode ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                  preferences.darkMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="font-medium text-foreground">Formato Regional</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Idioma
              </label>
              <select
                value={preferences.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Moneda
              </label>
              <select
                value={preferences.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="HNL">Lempiras (HNL)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Formato de Hora
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => handleChange('timeFormat', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="12h">12 horas (AM/PM)</option>
                <option value="24h">24 horas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Formato de Fecha
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="font-medium text-foreground">Notificaciones</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <Icon name="EnvelopeIcon" size={20} className="text-muted-foreground" />
                <div>
                  <h4 className="font-medium text-foreground">Email</h4>
                  <p className="caption text-muted-foreground">
                    Recibir notificaciones por correo electrónico
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle('email')}
                className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  preferences.notifications.email ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                aria-label="Toggle email notifications"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                    preferences.notifications.email ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <Icon name="DevicePhoneMobileIcon" size={20} className="text-muted-foreground" />
                <div>
                  <h4 className="font-medium text-foreground">SMS</h4>
                  <p className="caption text-muted-foreground">
                    Recibir notificaciones por mensaje de texto
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle('sms')}
                className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  preferences.notifications.sms ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                aria-label="Toggle SMS notifications"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                    preferences.notifications.sms ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <Icon name="BellIcon" size={20} className="text-muted-foreground" />
                <div>
                  <h4 className="font-medium text-foreground">Push</h4>
                  <p className="caption text-muted-foreground">
                    Recibir notificaciones push en el navegador
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle('push')}
                className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  preferences.notifications.push ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                aria-label="Toggle push notifications"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                    preferences.notifications.push ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="font-medium text-foreground">Respaldo de Datos</h3>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-3">
              <Icon name="CloudArrowUpIcon" size={20} className="text-muted-foreground" />
              <div>
                <h4 className="font-medium text-foreground">Respaldo Automático</h4>
                <p className="caption text-muted-foreground">
                  Crear respaldos automáticos de los datos
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('autoBackup')}
              className={`w-12 h-6 rounded-full transition-smooth relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                preferences.autoBackup ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              aria-label="Toggle auto backup"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                  preferences.autoBackup ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {preferences.autoBackup && (
            <div className="ml-4 p-4 border border-border rounded-lg bg-muted/30">
              <label className="block text-sm font-medium text-foreground mb-2">
                Frecuencia de Respaldo
              </label>
              <select
                value={preferences.backupFrequency}
                onChange={(e) => handleChange('backupFrequency', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
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
      </div>
    </div>
  );
};

export default SystemPreferencesSection;