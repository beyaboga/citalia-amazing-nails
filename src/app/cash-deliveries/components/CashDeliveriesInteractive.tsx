'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import NewDeliveryTab from './NewDeliveryTab';
import PendingTab from './PendingTab';
import HistoryTab from './HistoryTab';

type TabType = 'new' | 'pending' | 'history';

interface EmployeeOption { teamMemberId: number; name: string }
interface MethodOption { id: number; name: string }

const CashDeliveriesInteractive = () => {
  const searchParams = useSearchParams();
  const { can, isLoading: sessionLoading } = useSession();
  const canManage = can('cash.deliveries.manage');

  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) ?? 'new');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/team-members')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setEmployees(rows.filter((m) => m.isBookable && m.teamMemberId).map((m) => ({ teamMemberId: m.teamMemberId, name: m.name }))))
      .catch(() => {});
    fetch('/api/payment-methods')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setMethods(rows.filter((m) => m.isActive && m.type !== 'SPLIT_PAYMENT').map((m) => ({ id: m.id, name: m.name }))))
      .catch(() => {});
  }, []);

  const goToEmployee = (employeeId: number) => {
    setSelectedEmployeeId(String(employeeId));
    setActiveTab('new');
  };

  if (!sessionLoading && !canManage) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para gestionar entregas de caja.</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'new', label: 'Nueva Entrega', icon: 'BanknotesIcon' },
    { id: 'pending', label: 'Pendientes', icon: 'ClockIcon' },
    { id: 'history', label: 'Historial', icon: 'ArchiveBoxIcon' },
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
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon name={tab.icon as any} size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'new' && (
        <NewDeliveryTab
          employees={employees}
          methods={methods}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeChange={setSelectedEmployeeId}
          onDelivered={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {activeTab === 'pending' && <PendingTab key={refreshKey} onGoToEmployee={goToEmployee} />}
      {activeTab === 'history' && <HistoryTab key={refreshKey} employees={employees} />}
    </div>
  );
};

export default CashDeliveriesInteractive;
