import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartConfig } from '../types';
import { Loader2, AlertCircle, Maximize2, Info, BarChart3, Settings } from 'lucide-react';

interface Props {
  config: ChartConfig;
  refreshKey: number;
  accentIndex?: number;
}

// Color palettes for charts — vibrant dark-mode friendly
const CHART_PALETTES = [
  ['#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
  ['#06B6D4', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
  ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'],
  ['#F59E0B', '#EF4444', '#FCD34D', '#FCA5A5', '#FDE68A'],
  ['#EC4899', '#8B5CF6', '#F472B6', '#C084FC', '#FBCFE8'],
  ['#14B8A6', '#0EA5E9', '#2DD4BF', '#38BDF8', '#99F6E4'],
];

const ACCENT_GRADS = [
  { from: '#6366F1', to: '#8B5CF6' },
  { from: '#06B6D4', to: '#3B82F6' },
  { from: '#10B981', to: '#059669' },
  { from: '#F59E0B', to: '#EF4444' },
  { from: '#EC4899', to: '#8B5CF6' },
  { from: '#14B8A6', to: '#0EA5E9' },
];

const ChartRenderer: React.FC<Props> = ({ config, refreshKey, accentIndex = 0 }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palette = CHART_PALETTES[accentIndex % 6];
  const grad = ACCENT_GRADS[accentIndex % 6];

  useEffect(() => {
    if (!config.dataSource.table || !config.dataSource.xAxis || !config.dataSource.yAxis) {
      setData([]);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post('/api/query', {
          table: config.dataSource.table,
          columns: [config.dataSource.xAxis],
          aggregations: [{ column: config.dataSource.yAxis, func: config.dataSource.aggregation, alias: 'value' }],
          groupBy: [config.dataSource.xAxis],
          filters: config.filters
        });
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [config, refreshKey]);

  const xData = data.map(item => item[config.dataSource.xAxis]);
  const yData = data.map(item => item.value || item['value']);

  const option: any = {
    backgroundColor: 'transparent',
    color: palette,
    tooltip: {
      trigger: config.type === 'pie' ? 'item' : 'axis',
      backgroundColor: 'rgba(26, 26, 40, 0.85)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#F1F5F9', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 },
      padding: [12, 16],
      borderRadius: 12,
      shadowBlur: 30,
      shadowColor: 'rgba(0,0,0,0.5)',
      // Note: backdropFilter usually isn't supported inside canvas tooltips, but keeping backgroundColor translucent is great
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.03)' } }
    },
    xAxis: config.type !== 'pie' ? {
      type: 'category',
      data: xData,
      axisLabel: { color: '#8892A4', fontSize: 11, fontWeight: 500, margin: 16, interval: 'auto' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      splitLine: { show: false }
    } : undefined,
    yAxis: config.type !== 'pie' ? {
      type: 'value',
      axisLabel: { color: '#8892A4', fontSize: 11, fontWeight: 500, margin: 16 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false }
    } : undefined,
    series: [{
      data: config.type === 'pie'
        ? data.map(item => ({ name: item[config.dataSource.xAxis], value: item.value }))
        : yData,
      type: config.type === 'table' ? 'bar' : (config.type as any),
      smooth: 0.5,
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: false,
      barWidth: '40%',
      itemStyle: {
        borderRadius: config.type === 'bar' ? [6, 6, 0, 0] : 10,
        borderColor: config.type === 'pie' ? '#11111A' : 'transparent',
        borderWidth: config.type === 'pie' ? 3 : 0,
        color: config.type === 'bar' || config.type === 'line'
          ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: grad.from },
              { offset: 1, color: config.type === 'bar' ? `${grad.to}90` : grad.from }
            ])
          : undefined,
      },
      lineStyle: { 
        width: 4, 
        color: grad.from,
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowBlur: 10,
        shadowOffsetY: 6
      },
      areaStyle: config.type === 'line' ? {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: `${grad.from}70` },
          { offset: 1, color: 'rgba(0,0,0,0)' }
        ])
      } : undefined,
      radius: config.type === 'pie' ? ['50%', '80%'] : undefined,
      emphasis: {
        focus: 'series',
        scale: true,
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.4)' }
      },
      label: config.type === 'pie' ? { 
        show: false 
      } : undefined
    }],
    grid: { left: '3%', right: '4%', bottom: '5%', top: '8%', containLabel: true },
    legend: config.type === 'pie' ? {
      bottom: '0%',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#94A3B8', fontSize: 12, fontWeight: 500 }
    } : undefined,
  };

  return (
    <motion.div
      className={`glass-card glass-card-hover glass-card-accent chart-accent-${accentIndex % 6} p-6 flex flex-col`}
      style={{ height: 400 }}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-1 flex-1 min-w-0">
          <h3
            className="text-sm font-bold truncate"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            {config.title}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 10 }}
            >
              {config.dataSource.table || '—'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>•</span>
            <span
              className="text-xs font-bold"
              style={{ color: grad.from, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              {config.dataSource.aggregation}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          <button className="btn-icon" style={{ width: 30, height: 30, borderRadius: 8 }} title="Info">
            <Info size={14} />
          </button>
          <button className="btn-icon" style={{ width: 30, height: 30, borderRadius: 8 }} title="Expandir">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: grad.from }}
                />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Cargando datos...
                </span>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6"
            >
              <AlertCircle size={32} style={{ color: 'var(--danger)', opacity: 0.6 }} />
              <p className="text-xs font-medium leading-relaxed max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                {error}
              </p>
            </motion.div>
          ) : !config.dataSource.table || !config.dataSource.xAxis || !config.dataSource.yAxis ? (
            <motion.div
              key="unconfigured"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-overlay)' }}>
                <Settings size={22} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Faltan variables
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Abrí la configuración para elegir el eje X e Y.
              </p>
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-overlay)' }}
              >
                <BarChart3 size={22} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Sin resultados
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full min-h-[250px]"
            >
              <ReactECharts 
                option={option} 
                style={{ height: '100%', width: '100%', minHeight: '250px' }} 
                opts={{ renderer: 'canvas' }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ChartRenderer;
