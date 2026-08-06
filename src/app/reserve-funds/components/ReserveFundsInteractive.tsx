'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import PanelTab from './PanelTab';
import FundsTab from './FundsTab';
import MovementsTab from './MovementsTab';
import PeriodsTab from './PeriodsTab';

type TabType = 'panel' | 'funds' | 'movements' | 'periods';

const ReserveFundsInteractive = () => {
  const searchParams = useSearchParams();
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('funds.view');
  const canManage = can('funds.manage');
  const canContribute = can('funds.contribute');

  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) ?? 'panel'
  );
  const [refreshKey, setRefreshKey] = useState(0);

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">
          No tiene permiso para ver los Fondos Reservados.
        </p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'panel', label: 'Panel', icon: 'ChartPieIcon' },
    { id: 'funds', label: 'Fondos', icon: 'WalletIcon' },
    { id: 'movements', label: 'Movimientos', icon: 'ArrowsRightLeftIcon' },
    { id: 'periods', label: 'Períodos', icon: 'CalendarDaysIcon' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-2 shadow-warm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium transition-smooth ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon name={tab.icon as any} size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'panel' && <PanelTab key={refreshKey} />}
      {activeTab === 'funds' && (
        <FundsTab
          key={refreshKey}
          canManage={canManage}
          canContribute={canContribute}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {activeTab === 'movements' && <MovementsTab key={refreshKey} />}
      {activeTab === 'periods' && (
        <PeriodsTab
          key={refreshKey}
          canManage={canManage}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default ReserveFundsInteractive;
