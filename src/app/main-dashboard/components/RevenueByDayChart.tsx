import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatLempiras } from '@/lib/payroll';

interface RevenuePoint {
  day: string;
  revenue: number;
}

interface RevenueByDayChartProps {
  data: RevenuePoint[];
}

const RevenueByDayChart = ({ data }: RevenueByDayChartProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <div className="mb-6">
        <h3 className="text-xl font-heading font-semibold text-foreground mb-1">Ingresos por Día</h3>
        <p className="caption text-muted-foreground">Por día en el período seleccionado · ingreso por servicios</p>
      </div>
      <div className="w-full h-80" aria-label="Gráfico de ingresos por día">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="day"
              stroke="var(--color-muted-foreground)"
              style={{ fontSize: '14px', fontFamily: 'Source Sans 3, sans-serif' }}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              style={{ fontSize: '13px', fontFamily: 'Source Sans 3, sans-serif' }}
              width={70}
              tickFormatter={(v) => `L ${Number(v).toLocaleString('es-HN')}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(45, 27, 30, 0.12)',
              }}
              labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
              formatter={(value: number) => [formatLempiras(value), 'Ingresos']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueByDayChart;
