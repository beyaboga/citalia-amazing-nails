import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartDataPoint {
  day: string;
  appointments: number;
  completed: number;
}

interface AppointmentsByDayChartProps {
  data: ChartDataPoint[];
}

const AppointmentsByDayChart = ({ data }: AppointmentsByDayChartProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <div className="mb-6">
        <h3 className="text-xl font-heading font-semibold text-foreground mb-1">
          Citas por Día
        </h3>
        <p className="caption text-muted-foreground">Por día en el período seleccionado</p>
      </div>
      <div className="w-full h-80" aria-label="Gráfico de barras de citas por día">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="day" 
              stroke="var(--color-muted-foreground)"
              style={{ fontSize: '14px', fontFamily: 'Source Sans 3, sans-serif' }}
            />
            <YAxis 
              stroke="var(--color-muted-foreground)"
              style={{ fontSize: '14px', fontFamily: 'Source Sans 3, sans-serif' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(45, 27, 30, 0.12)'
              }}
              labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--color-muted-foreground)' }}
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px',
                fontFamily: 'Source Sans 3, sans-serif',
                fontSize: '14px'
              }}
            />
            <Bar 
              dataKey="appointments" 
              fill="var(--color-primary)" 
              radius={[8, 8, 0, 0]}
              name="Total Citas"
            />
            <Bar 
              dataKey="completed" 
              fill="var(--color-success)" 
              radius={[8, 8, 0, 0]}
              name="Completadas"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AppointmentsByDayChart;