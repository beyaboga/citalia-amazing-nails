'use client';

import { useState } from 'react';
import OperatingHoursSection from './OperatingHoursSection';
import NonWorkingDaysSection from './NonWorkingDaysSection';
import BookingPoliciesSection from './BookingPoliciesSection';
import SystemPreferencesSection from './SystemPreferencesSection';
import WhatsAppMessagesSection from './WhatsAppMessagesSection';
import PaymentMethodsSection from './PaymentMethodsSection';
import TipSettingsSection from './TipSettingsSection';
import ReceiptSettingsSection from './ReceiptSettingsSection';
import FollowupSettingsSection from './FollowupSettingsSection';
import Icon from '@/components/ui/AppIcon';

type TabType =
  | 'hours'
  | 'days'
  | 'policies'
  | 'payment-methods'
  | 'tips'
  | 'receipts'
  | 'whatsapp'
  | 'followup'
  | 'preferences';

const BusinessSettingsInteractive = () => {
  const [activeTab, setActiveTab] = useState<TabType>('hours');

  const tabs = [
    { id: 'hours' as TabType, label: 'Horarios', icon: 'ClockIcon' },
    { id: 'days' as TabType, label: 'Días No Laborables', icon: 'CalendarDaysIcon' },
    { id: 'policies' as TabType, label: 'Políticas', icon: 'DocumentTextIcon' },
    { id: 'payment-methods' as TabType, label: 'Métodos de pago', icon: 'BanknotesIcon' },
    { id: 'tips' as TabType, label: 'Propinas', icon: 'SparklesIcon' },
    { id: 'receipts' as TabType, label: 'Recibos', icon: 'ReceiptPercentIcon' },
    { id: 'whatsapp' as TabType, label: 'Mensajes WhatsApp', icon: 'ChatBubbleLeftRightIcon' },
    { id: 'followup' as TabType, label: 'Seguimiento', icon: 'ArrowPathIcon' },
    { id: 'preferences' as TabType, label: 'Preferencias', icon: 'Cog6ToothIcon' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-2 shadow-warm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-warm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon name={tab.icon as any} size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="transition-smooth">
        {activeTab === 'hours' && <OperatingHoursSection />}
        {activeTab === 'days' && <NonWorkingDaysSection />}
        {activeTab === 'policies' && <BookingPoliciesSection />}
        {activeTab === 'payment-methods' && <PaymentMethodsSection />}
        {activeTab === 'tips' && <TipSettingsSection />}
        {activeTab === 'receipts' && <ReceiptSettingsSection />}
        {activeTab === 'whatsapp' && <WhatsAppMessagesSection />}
        {activeTab === 'followup' && <FollowupSettingsSection />}
        {activeTab === 'preferences' && <SystemPreferencesSection />}
      </div>
    </div>
  );
};

export default BusinessSettingsInteractive;