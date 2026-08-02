import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface ServicesByCategoryChartProps {
  data: CategoryData[];
}

const ServicesByCategoryChart = ({ data }: ServicesByCategoryChartProps) => {
  const RADIAN = Math.PI / 180;
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Source Sans 3, sans-serif' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <div className="mb-6">
        <h3 className="text-xl font-heading font-semibold text-foreground mb-1">
          Servicios por Categoría
        </h3>
        <p className="caption text-muted-foreground">Distribución de servicios solicitados en el período</p>
      </div>
      <div className="w-full h-80" aria-label="Gráfico circular de servicios por categoría">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(45, 27, 30, 0.12)'
              }}
              itemStyle={{ color: 'var(--color-muted-foreground)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ 
                paddingTop: '20px',
                fontFamily: 'Source Sans 3, sans-serif',
                fontSize: '14px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ServicesByCategoryChart;