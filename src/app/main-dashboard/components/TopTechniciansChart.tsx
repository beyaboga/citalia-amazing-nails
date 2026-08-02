import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';

interface TechRow {
  name: string;
  revenue: number;
}

interface TopTechniciansChartProps {
  data: TechRow[];
}

const BAR_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
];

const TopTechniciansChart = ({ data }: TopTechniciansChartProps) => {
  // Nombre corto (primer nombre + inicial) para que quepa en el eje.
  const rows = data.map((t) => {
    const parts = t.name.split(' ');
    const shortName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
    return { ...t, shortName };
  });

  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <div className="mb-6">
        <h3 className="text-xl font-heading font-semibold text-foreground mb-1">Top Técnicos</h3>
        <p className="caption text-muted-foreground">Ingresos generados en el período</p>
      </div>
      <div className="w-full h-80" aria-label="Gráfico de ingresos por técnico">
        {rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Icon name="UsersIcon" size={40} className="text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">Sin ingresos registrados en el período</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--color-muted-foreground)"
                style={{ fontSize: '13px', fontFamily: 'Source Sans 3, sans-serif' }}
                tickFormatter={(v) => `L ${Number(v).toLocaleString('es-HN')}`}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                stroke="var(--color-muted-foreground)"
                style={{ fontSize: '13px', fontFamily: 'Source Sans 3, sans-serif' }}
                width={90}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(45, 27, 30, 0.12)',
                }}
                labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
                formatter={(value: number) => [formatLempiras(value), 'Ingresos']}
              />
              <Bar dataKey="revenue" radius={[0, 8, 8, 0]} name="Ingresos">
                {rows.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TopTechniciansChart;
