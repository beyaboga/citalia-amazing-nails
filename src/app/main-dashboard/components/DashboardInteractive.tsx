'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import MetricsCard from './MetricsCard';
import AppointmentsByDayChart from './AppointmentsByDayChart';
import ServicesByCategoryChart from './ServicesByCategoryChart';
import RevenueByDayChart from './RevenueByDayChart';
import TopTechniciansChart from './TopTechniciansChart';
import IncomeVsExpenseChart from './IncomeVsExpenseChart';
import CustomerFollowupCards from './CustomerFollowupCards';
import CashDeliveriesCards from './CashDeliveriesCards';
import UpcomingAppointmentsTable from './UpcomingAppointmentsTable';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';
import { rangeForPreset, type DateRangePreset } from '@/lib/reportFilters';
import { exportCsv, exportXlsx } from '@/lib/exportTable';
import DateRangePresetFilter from '@/components/common/DateRangePresetFilter';

interface Trend { value: number; isPositive: boolean }

interface DashboardData {
  period: { from: string; to: string };
  metrics: {
    appointments: number;
    appointmentsTrend: Trend;
    cancellations: number;
    cancellationsTrend: Trend;
    topService: { name: string; count: number } | null;
    income: number;
    incomeTrend: Trend;
    expense: number;
    expenseTrend: Trend;
    utilidad: number;
    utilidadTrend: Trend;
    totalCustomers: number;
    totalCustomersTrend: Trend;
    newCustomers: number;
    returningCustomers: number;
    topTechnician: { name: string; revenue: number } | null;
  };
  appointmentsByDay: { day: string; appointments: number; completed: number }[];
  revenueByDay: { day: string; revenue: number }[];
  servicesByCategory: { name: string; value: number }[];
  topTechnicians: { name: string; revenue: number }[];
  incomeVsExpense: { month: string; income: number; expenses: number }[];
  customerFollowup: { today: number; upcoming: number; overdue: number; lost: number };
  cashDeliveries: { pendingTotal: number; pendingCash: number; pendingTransfers: number; lastDelivery: string | null };
  upcoming: {
    id: number;
    clientName: string;
    service: string;
    time: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    phone: string | null;
  }[];
}

const CATEGORY_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
];

const CardsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-card rounded-lg p-6 shadow-warm border border-border animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-4" />
        <div className="h-8 bg-muted rounded w-32" />
      </div>
    ))}
  </div>
);

const DashboardInteractive = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState<DateRangePreset>('MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const { from, to } = useMemo(() => rangeForPreset(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard?from=${from}&to=${to}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el panel');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el panel');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const buildExportData = () => {
    if (!data) return { headers: [], rows: [] };
    const m = data.metrics;
    return {
      headers: [
        'Período', 'Ventas', 'Citas realizadas', 'Cancelaciones', 'Gastos', 'Utilidad estimada',
        'Número de clientes', 'Clientes nuevas', 'Clientes recurrentes', 'Servicio más vendido', 'Empleada destacada',
      ],
      rows: [[
        `${data.period.from} a ${data.period.to}`, m.income, m.appointments, m.cancellations, m.expense, m.utilidad,
        m.totalCustomers, m.newCustomers, m.returningCustomers,
        m.topService?.name ?? '—', m.topTechnician?.name ?? '—',
      ]],
    };
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <CardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-card rounded-lg shadow-warm border border-border animate-pulse" />
          <div className="h-96 bg-card rounded-lg shadow-warm border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="ExclamationCircleIcon" size={48} className="text-error mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{error || 'Sin datos'}</h3>
        <button
          onClick={load}
          className="mt-2 h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const m = data.metrics;
  const comparisonLabel = 'vs período anterior';
  const metricsData = [
    { title: 'Ventas del período', value: formatLempiras(m.income), icon: 'CurrencyDollarIcon', trend: m.incomeTrend },
    { title: 'Citas realizadas', value: m.appointments, icon: 'CalendarDaysIcon', trend: m.appointmentsTrend },
    { title: 'Cancelaciones', value: m.cancellations, icon: 'XCircleIcon', trend: m.cancellationsTrend },
    { title: 'Gastos del período', value: formatLempiras(m.expense), icon: 'ArrowTrendingDownIcon', trend: m.expenseTrend, subtitle: 'Gastos + planilla pagados' },
    { title: 'Utilidad estimada', value: formatLempiras(m.utilidad), icon: 'BanknotesIcon', trend: m.utilidadTrend, subtitle: 'Ingresos − gastos' },
    { title: 'Número de clientes', value: m.totalCustomers, icon: 'UserGroupIcon', trend: m.totalCustomersTrend },
    { title: 'Nuevas vs Recurrentes', value: m.newCustomers, icon: 'SparklesIcon', subtitle: `${m.returningCustomers} recurrentes` },
    {
      title: 'Servicio Más Vendido', value: m.topService?.name ?? '—', icon: 'StarIcon',
      subtitle: m.topService ? `${m.topService.count} en el período` : 'Sin datos en el período',
    },
    {
      title: 'Empleada Destacada', value: m.topTechnician?.name ?? '—', icon: 'TrophyIcon',
      subtitle: m.topTechnician ? formatLempiras(m.topTechnician.revenue) : 'Sin ventas en el período',
    },
  ];

  const categoryData = data.servicesByCategory.map((c, i) => ({
    ...c,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <DateRangePresetFilter
            preset={preset} onPresetChange={setPreset}
            customFrom={customFrom} customTo={customTo}
            onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
          />
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => { const d = buildExportData(); exportCsv(`dashboard_${from}_${to}.csv`, d.headers, d.rows); }}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth flex items-center justify-center gap-2"
            >
              <Icon name="ArrowDownTrayIcon" size={18} /> CSV
            </button>
            <button
              onClick={() => { const d = buildExportData(); exportXlsx(`dashboard_${from}_${to}.xlsx`, d.headers, d.rows); }}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth flex items-center justify-center gap-2"
            >
              <Icon name="ArrowDownTrayIcon" size={18} /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${isLoading ? 'opacity-60' : ''}`}>
        {metricsData.map((metric, index) => (
          <MetricsCard
            key={index}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            trend={metric.trend}
            comparisonLabel={comparisonLabel}
            subtitle={metric.subtitle}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppointmentsByDayChart data={data.appointmentsByDay} />
        <RevenueByDayChart data={data.revenueByDay} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServicesByCategoryChart data={categoryData} />
        <TopTechniciansChart data={data.topTechnicians} />
      </div>

      <IncomeVsExpenseChart data={data.incomeVsExpense} />

      <CustomerFollowupCards data={data.customerFollowup} />

      <CashDeliveriesCards data={data.cashDeliveries} />

      <UpcomingAppointmentsTable appointments={data.upcoming} onRefresh={load} />
    </div>
  );
};

export default DashboardInteractive;
