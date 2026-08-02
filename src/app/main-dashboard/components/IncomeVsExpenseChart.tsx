import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatLempiras } from '@/lib/payroll';

interface MonthPoint {
  month: string;
  income: number;
  expenses: number;
}

interface IncomeVsExpenseChartProps {
  data: MonthPoint[];
}

const IncomeVsExpenseChart = ({ data }: IncomeVsExpenseChartProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <div className="mb-6">
        <h3 className="text-xl font-heading font-semibold text-foreground mb-1">Ingresos vs Gastos</h3>
        <p className="caption text-muted-foreground">Últimos 6 meses (tendencia fija, no cambia con el filtro de período)</p>
      </div>
      <div className="w-full h-80" aria-label="Gráfico de ingresos contra gastos por mes">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="month"
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
              formatter={(value: number, name: string) => [formatLempiras(value), name]}
            />
            <Legend wrapperStyle={{ paddingTop: '16px', fontFamily: 'Source Sans 3, sans-serif', fontSize: '14px' }} />
            <Bar dataKey="income" name="Ingresos" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" name="Gastos" fill="var(--color-error)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncomeVsExpenseChart;
