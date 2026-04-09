import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, BarChart2, TrendingUp, PieChart,
  Table as TableIcon, Plus, Trash2, Filter,
  ChevronDown, Settings, Sparkles, Wand2
} from 'lucide-react';
import { ChartConfig } from '../types';

interface Props {
  config: ChartConfig;
  dashboardId?: string;
  onSave: (config: ChartConfig) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const CHART_TYPES = [
  { id: 'bar',   icon: BarChart2,  label: 'Barras' },
  { id: 'line',  icon: TrendingUp, label: 'Líneas' },
  { id: 'pie',   icon: PieChart,   label: 'Circular' },
  { id: 'table', icon: TableIcon,  label: 'Tabla' },
];

const AGGREGATIONS = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];

const ChartConfigurator: React.FC<Props> = ({ config, dashboardId, onSave, onClose, onDelete }) => {
  const [editedConfig, setEditedConfig] = useState<ChartConfig>({ ...config });
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<ChartConfig[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [availableSources, setAvailableSources] = useState<any[]>([]);

  useEffect(() => {
    if (dashboardId) {
      api.get(`/dashboards/${dashboardId}/data-sources`)
        .then(r => {
          setAvailableSources(r.data);
          const tableNames = r.data.map((ds: any) => ds.table_name).filter(Boolean);
          setTables(tableNames);
        })
        .catch(console.error);
    } else {
      api.get('/tables').then(r => setTables(r.data)).catch(console.error);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (!editedConfig.dataSource.table) {
      setSuggestions([]);
      return;
    }
    
    api.get(`/schema/${editedConfig.dataSource.table}`)
      .then(r => setColumns(Object.keys(r.data)))
      .catch(console.error);

    // Fetch suggestions
    const source = availableSources.find(s => s.table_name === editedConfig.dataSource.table);
    if (source || editedConfig.dataSource.table) {
      setLoadingSuggestions(true);
      const url = source 
        ? `/data-sources/${source.id}/suggestions`
        : `/tables/${editedConfig.dataSource.table}/suggestions`;
        
      api.get(url)
        .then(r => {
          console.log('Suggestions received:', r.data);
          setSuggestions(r.data);
        })
        .catch(err => {
          console.error('Error fetching suggestions:', err);
          setSuggestions([]);
        })
        .finally(() => setLoadingSuggestions(false));
    }
  }, [editedConfig.dataSource.table, availableSources]);

  const updateDS = (patch: Partial<typeof editedConfig.dataSource>) =>
    setEditedConfig(c => ({ ...c, dataSource: { ...c.dataSource, ...patch } }));

  const addFilter = () =>
    setEditedConfig(c => ({
      ...c,
      filters: [...c.filters, { column: columns[0] || '', operator: '=', value: '' }]
    }));

  const removeFilter = (i: number) =>
    setEditedConfig(c => ({ ...c, filters: c.filters.filter((_, idx) => idx !== i) }));

  const updateFilter = (i: number, patch: Partial<typeof editedConfig.filters[0]>) =>
    setEditedConfig(c => {
      const filters = [...c.filters];
      filters[i] = { ...filters[i], ...patch };
      return { ...c, filters };
    });

  const applySuggestion = (suggestion: ChartConfig) => {
    setEditedConfig(prev => ({
      ...prev,
      title: suggestion.title,
      type: suggestion.type,
      dataSource: {
        ...prev.dataSource,
        ...suggestion.dataSource
      }
    }));
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0,      opacity: 1 }}
      exit={{   x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 200 }}
      className="fixed inset-y-3 right-3 flex flex-col"
      style={{
        width: 400,
        zIndex: 50,
        background: 'var(--bg-elevated)',
        borderRadius: 16,
        border: '1px solid var(--border-default)',
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
        backdropFilter: 'blur(20px)',
        overflowX: 'hidden'
      }}
      id="configurator-drawer"
      onClick={e => e.stopPropagation()}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-7 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-subtle)' }}
          >
            <Settings size={17} style={{ color: 'var(--accent-from)' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Configuración
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Ajustes del widget
            </p>
          </div>
        </div>
        <button
          id="btn-close-configurator"
          onClick={onClose}
          className="btn-icon"
          title="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">

        {/* Title */}
        <section className="space-y-2">
          <label className="configurator-section-title" htmlFor="chart-title">
            Título del análisis
          </label>
          <input
            id="chart-title"
            type="text"
            className="field-input"
            value={editedConfig.title}
            onChange={e => setEditedConfig(c => ({ ...c, title: e.target.value }))}
            placeholder="Ej: Ventas por mes"
          />
        </section>

        {/* Smart Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.section
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <p className="configurator-section-title" style={{ marginBottom: 0 }}>Sugerencias Mágicas</p>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    onClick={() => applySuggestion(s)}
                    className="flex items-start gap-3 p-3 rounded-xl transition-all text-left group"
                    style={{
                      background: 'var(--accent-subtle2)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--accent-subtle)';
                      e.currentTarget.style.borderColor = 'var(--accent-from)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--accent-subtle2)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-subtle)' }}
                    >
                      <Wand2 size={15} style={{ color: 'var(--accent-from)' }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)', margin: 0 }}>
                        {s.title}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-from)', opacity: 0.8, marginTop: 2 }}>
                        {s.type.toUpperCase()} · POR {s.dataSource.xAxis} 
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Chart type */}
        <section className="space-y-3">
          <p className="configurator-section-title">Visualización</p>
          <div className="grid grid-cols-2 gap-2">
            {CHART_TYPES.map(type => (
              <button
                key={type.id}
                id={`chart-type-${type.id}`}
                onClick={() => setEditedConfig(c => ({ ...c, type: type.id as any }))}
                className={`chart-type-btn ${editedConfig.type === type.id ? 'selected' : ''}`}
              >
                <type.icon size={16} />
                {type.label}
              </button>
            ))}
          </div>
        </section>

        {/* Data mapping */}
        <section className="space-y-4">
          <p className="configurator-section-title">Mapeo de datos</p>

          <div>
            <label className="field-label" htmlFor="ds-table">Tabla / Entidad</label>
            <div className="relative">
              <select
                id="ds-table"
                className="field-input appearance-none pr-9"
                value={editedConfig.dataSource.table}
                onChange={e => updateDS({ table: e.target.value })}
              >
                <option value="">Seleccionar tabla...</option>
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-secondary)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="ds-xaxis">Eje X (categoría)</label>
              <select
                id="ds-xaxis"
                className="field-input appearance-none"
                value={editedConfig.dataSource.xAxis}
                onChange={e => updateDS({ xAxis: e.target.value })}
              >
                <option value="">Campo...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="ds-yaxis">Eje Y (valor)</label>
              <select
                id="ds-yaxis"
                className="field-input appearance-none"
                value={editedConfig.dataSource.yAxis}
                onChange={e => updateDS({ yAxis: e.target.value })}
              >
                <option value="">Campo...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Aggregation */}
          <div>
            <label className="field-label">Agregación</label>
            <div
              className="grid gap-1 p-1.5 rounded-xl"
              style={{
                gridTemplateColumns: 'repeat(5, 1fr)',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {AGGREGATIONS.map(func => (
                <button
                  key={func}
                  id={`agg-${func.toLowerCase()}`}
                  onClick={() => updateDS({ aggregation: func as any })}
                  className={`agg-btn ${editedConfig.dataSource.aggregation === func ? 'selected' : ''}`}
                >
                  {func}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="configurator-section-title" style={{ marginBottom: 0 }}>Filtros</p>
            <button
              id="btn-add-filter"
              onClick={addFilter}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--accent-from)', background: 'var(--accent-subtle2)' }}
            >
              <Plus size={13} />
              Añadir
            </button>
          </div>

          {editedConfig.filters.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl"
              style={{ border: '1.5px dashed var(--border-subtle)' }}
            >
              <Filter size={18} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Sin filtros activos
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {editedConfig.filters.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="filter-row"
                >
                  <select
                    className="flex-1 bg-transparent border-none text-xs font-semibold outline-none"
                    style={{ color: 'var(--text-primary)', minWidth: 0 }}
                    value={f.column}
                    onChange={e => updateFilter(i, { column: e.target.value })}
                  >
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    className="w-10 border rounded-lg px-1.5 py-1 text-xs font-bold text-center"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--accent-from)',
                      appearance: 'none'
                    }}
                    value={f.operator}
                    onChange={e => updateFilter(i, { operator: e.target.value })}
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="LIKE">~</option>
                  </select>

                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none text-xs font-semibold outline-none"
                    style={{ color: 'var(--text-primary)', minWidth: 0 }}
                    placeholder="Valor..."
                    value={f.value}
                    onChange={e => updateFilter(i, { value: e.target.value })}
                  />

                  <button
                    onClick={() => removeFilter(i)}
                    className="btn-icon"
                    style={{ width: 28, height: 28, borderRadius: 8, color: 'var(--danger)', flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </section>
      </div>

      {/* ── FOOTER ── */}
      <div
        className="px-7 py-5 flex-shrink-0 flex items-center gap-3"
        style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        {onDelete && (
          <button
            id="btn-delete-chart"
            onClick={() => onDelete(editedConfig.id)}
            className="btn-icon"
            style={{ width: 44, height: 44, borderRadius: 12, color: 'var(--danger)', flexShrink: 0, border: '1px solid var(--border-subtle)' }}
            title="Eliminar análisis"
          >
            <Trash2 size={18} />
          </button>
        )}
        <button
          id="btn-save-chart"
          onClick={() => onSave(editedConfig)}
          className="btn-primary flex-1"
          style={{ padding: '13px 24px', fontSize: 14 }}
        >
          <Save size={17} />
          Aplicar cambios
        </button>
      </div>
    </motion.div>
  );
};

export default ChartConfigurator;
