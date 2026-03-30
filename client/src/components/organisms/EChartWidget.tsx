import React from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { ChartConfig } from '../../../../shared/types'; // Adjust path as needed

interface EChartWidgetProps {
  chartConfig: ChartConfig;
  data: any[]; // Raw data from the backend
  loading: boolean;
}

const EChartWidget: React.FC<EChartWidgetProps> = ({ chartConfig, data, loading }) => {
  // ECharts dark theme options
  const darkThemeOptions = {
    backgroundColor: 'transparent', // Use parent's background
    textStyle: {
      color: '#E2E8F0', // slate-200
    },
    title: {
      textStyle: {
        color: '#E2E8F0',
      },
    },
    legend: {
      textStyle: {
        color: '#CBD5E1', // slate-300
      },
    },
    axisLabel: {
      color: '#94A3B8', // slate-400
    },
    axisLine: {
      lineStyle: {
        color: '#475569', // slate-600
      },
    },
    splitLine: {
      lineStyle: {
        color: '#334155', // slate-700
      },
    },
    tooltip: {
      backgroundColor: 'rgba(30, 41, 59, 0.9)', // slate-800 with transparency
      borderColor: '#475569', // slate-600
      borderWidth: 1,
      textStyle: {
        color: '#E2E8F0',
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);',
    },
  };

  const getOption = (): EChartsOption => {
    const sourceData = [
      chartConfig.columns, // First row is headers
      ...data.map(row => chartConfig.columns.map(col => row[col]))
    ];

    let series: any[] = [];
    if (chartConfig.type === 'bar') {
      series = chartConfig.columns.slice(1).map(() => ({ type: 'bar' }));
    } else if (chartConfig.type === 'line') {
      series = chartConfig.columns.slice(1).map(() => ({ type: 'line' }));
    } else if (chartConfig.type === 'pie') {
      // Pie charts are different, they usually take a single series with name-value pairs
      // This is a simplified example, a real implementation would need more logic
      series = [{
        type: 'pie',
        radius: '50%',
        center: ['50%', '50%'],
        encode: {
          itemName: chartConfig.columns[0],
          value: chartConfig.columns[1],
        }
      }];
    }

    return {
      ...darkThemeOptions, // Apply dark theme
      dataset: {
        source: sourceData,
      },
      tooltip: {
        trigger: 'axis',
        ...darkThemeOptions.tooltip,
      },
      xAxis: chartConfig.type !== 'pie' ? { type: 'category' } : undefined,
      yAxis: chartConfig.type !== 'pie' ? {} : undefined,
      series: series,
      // Merge custom options from chartConfig
      ...chartConfig.options,
    };
  };

  return (
    <div className="w-full h-full">
      {loading ? (
        <div className="flex items-center justify-center h-full bg-slate-800 rounded-lg animate-pulse">
          <p className="text-slate-400">Cargando gráfico...</p>
        </div>
      ) : (
        <ReactECharts
          option={getOption()}
          style={{ height: '100%', width: '100%' }}
          theme="dark" // ECharts built-in dark theme
        />
      )}
    </div>
  );
};

export default EChartWidget;
