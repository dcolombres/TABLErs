import React, { useState } from 'react';
import { ChartConfig } from '../../shared/types';
import EChartWidget from './components/organisms/EChartWidget'; // Import EChartWidget

// Placeholder for Lucide icon
const LucideIcon = ({ name }: { name: string }) => (
  <span className="text-gray-400">{name}</span>
);

// Placeholder for ChartCard component
const ChartCard: React.FC<{ chartConfig: ChartConfig; loading: boolean }> = ({ chartConfig, loading }) => {
  // Dummy data for EChartWidget
  const dummyData = [
    { month: 'Jan', value: 120 },
    { month: 'Feb', value: 200 },
    { month: 'Mar', value: 150 },
    { month: 'Apr', value: 80 },
    { month: 'May', value: 70 },
    { month: 'Jun', value: 110 },
  ];

  return (
    <div className="bg-card-bg border border-card-border rounded-lg shadow-lg overflow-hidden h-80"> {/* Fixed height for cards */}
      <div className="flex justify-between items-center p-4 border-b border-card-border">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <LucideIcon name={chartConfig.options?.icon || 'bar-chart'} />
          <span className="ml-2">{chartConfig.title}</span>
        </h3>
        {/* Options Menu */}
        <div className="text-gray-400 cursor-pointer">
          &#x22EF; {/* Three dots icon */}
        </div>
      </div>
      <div className="h-[calc(100%-64px)]"> {/* Adjust height for EChartWidget */}
        <EChartWidget chartConfig={chartConfig} data={dummyData} loading={loading} />
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [hasCharts, setHasCharts] = useState(true); // State to toggle empty state
  const [loadingCharts, setLoadingCharts] = useState(true); // State to simulate loading

  // Simulate loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingCharts(false);
    }, 2000); // Simulate 2 seconds loading
    return () => clearTimeout(timer);
  }, []);

  const chartConfigs: ChartConfig[] = [
    {
      id: '1',
      title: 'Ventas Mensuales',
      type: 'bar',
      tableName: 'sales_data',
      columns: ['month', 'value'],
      options: { icon: 'trending-up' }
    },
    {
      id: '2',
      title: 'Usuarios Activos',
      type: 'line',
      tableName: 'user_activity',
      columns: ['date', 'value'],
      options: { icon: 'users' }
    },
    {
      id: '3',
      title: 'Rendimiento del Servidor',
      type: 'pie',
      tableName: 'server_metrics',
      columns: ['metric', 'value'],
      options: { icon: 'server' }
    },
    {
      id: '4',
      title: 'Ingresos Diarios',
      type: 'bar',
      tableName: 'daily_revenue',
      columns: ['day', 'value'],
      options: { icon: 'dollar-sign' }
    },
  ];

  return (
    <div className="min-h-screen bg-primary-bg p-8 font-sans text-white">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {!hasCharts ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] bg-card-bg border border-card-border rounded-lg p-8">
          {/* Placeholder for illustration */}
          <svg className="w-32 h-32 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p className="text-xl text-slate-400 mb-4">¡Tu tablero está vacío!</p>
          <p className="text-slate-500 mb-6 text-center max-w-md">
            Parece que aún no has agregado ningún gráfico. Empieza a visualizar tus datos haciendo clic en el botón de abajo.
          </p>
          <button
            className="bg-primary-accent hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition duration-300 ease-in-out"
            onClick={() => setHasCharts(true)} // Example: add a chart
          >
            Agregar primer gráfico
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chartConfigs.map(config => (
            <ChartCard key={config.id} chartConfig={config} loading={loadingCharts} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
