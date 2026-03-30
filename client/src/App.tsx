import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Plus, RefreshCw,
  Settings, Save, Layers, Sparkles, LogOut,
  LayoutDashboard, FileUp, Activity,
  Zap, Shield, Globe
} from 'lucide-react';
import DataSourceSelector from './components/DataSourceSelector';
import ChartRenderer from './components/ChartRenderer';
import ChartConfigurator from './components/ChartConfigurator';
import { DashboardConfig, ChartConfig } from './types';

/* ── Feature bullets for landing ── */
const FEATURES = [
  { icon: Zap,     label: 'Conexión instantánea',  desc: 'Conecta PostgreSQL, MySQL o sube archivos SQL / CSV / Excel.' },
  { icon: Activity,label: 'Visualización en tiempo real', desc: 'Gráficos de barras, líneas, circular y tablas con ECharts.' },
  { icon: Shield,  label: 'Datos 100% locales',    desc: 'Sin cloud. Tu información nunca sale de tu máquina.' },
];

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardConfig>({
    title: 'Análisis sin título',
    charts: []
  });
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving]         = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await axios.get('/api/tables');
        if (r.data?.length > 0) setIsConnected(true);
      } catch { /* not connected */ }
    };
    const load = async () => {
      try {
        const r = await axios.get('/api/dashboard/default');
        if (r.data) setDashboard(r.data);
      } catch { /* fresh */ }
    };
    check();
    load();
  }, []);

  const handleAddChart = () => {
    if (dashboard.charts.length >= 6) return;
    const newChart: ChartConfig = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Nueva Métrica',
      type: 'bar',
      dataSource: { table: '', xAxis: '', yAxis: '', aggregation: 'SUM' },
      filters: []
    };
    setEditingChart(newChart);
  };

  const handleSaveChart = (cfg: ChartConfig) => {
    setDashboard(prev => {
      const exists = prev.charts.find(c => c.id === cfg.id);
      const charts = exists
        ? prev.charts.map(c => c.id === cfg.id ? cfg : c)
        : [...prev.charts, cfg];
      const next = { ...prev, charts };
      saveDashboard(next);
      return next;
    });
    setEditingChart(null);
  };

  const handleDeleteChart = (id: string) => {
    setDashboard(prev => {
      const charts = prev.charts.filter(c => c.id !== id);
      const next = { ...prev, charts };
      saveDashboard(next);
      return next;
    });
    setEditingChart(null);
  };

  const saveDashboard = async (config: DashboardConfig) => {
    setIsSaving(true);
    try { await axios.post('/api/dashboard/save', config); }
    catch (e) { console.error(e); }
    finally { setTimeout(() => setIsSaving(false), 800); }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  /* ════════════════════════════════
     LANDING — split layout
  ════════════════════════════════ */
  if (!isConnected) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 480px',
        background: 'var(--bg-base)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: 'absolute', width: 800, height: 800,
          borderRadius: '50%', left: -200, top: -200,
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 600, height: 600,
          borderRadius: '50%', right: 200, bottom: -200,
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* ── LEFT: Branding panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.25,0.1,0.25,1] }}
          style={{
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '60px 64px',
            position: 'relative', zIndex: 1,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div className="logo-mark" style={{ width: 40, height: 40, borderRadius: 12 }}>
              <BarChart3 size={20} color="white" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Tablers
            </span>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-[52px] font-black leading-tight text-white tracking-tight mb-4">
              Análisis de datos.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-400">
                Sin fricción.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-md m-0">
              Conecta tu fuente de datos y transformá números en dashboards visuales en segundos. Sin código. Sin cloud.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: 12,
                  background: 'var(--accent-subtle)', border: '1px solid var(--accent-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: 'var(--accent-from)' }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Version badge */}
          <div style={{ marginTop: 60, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Tablers v1.0 · Local-first · Open source
          </div>
        </motion.div>

        {/* ── RIGHT: Connection panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25,0.1,0.25,1] }}
          style={{
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '48px 40px',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            position: 'relative', zIndex: 1,
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Conectar fuente de datos
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Subí un archivo o conectate directamente a tu base de datos.
            </p>
          </div>

          <DataSourceSelector onConnected={() => setIsConnected(true)} />

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { icon: Shield, label: 'Encriptado' },
              { icon: Globe, label: 'Sin nube' },
              { icon: Sparkles, label: 'Multi-formato' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="trust-badge" style={{ fontSize: 11 }}>
                <Icon size={12} />
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════
     DASHBOARD — sidebar + main
  ════════════════════════════════ */
  const SIDEBAR_W = 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', position: 'relative' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)',
        position: 'fixed', inset: '0 auto 0 0', zIndex: 30, padding: '20px 0',
      }}>
        {/* Logo */}
        <div style={{ padding: '4px 20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-mark">
              <BarChart3 size={16} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Tablers<span style={{ color: 'var(--accent-from)' }}>.</span>
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Active: Dashboard */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10,
            background: 'var(--accent-subtle)', color: 'var(--accent-from)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            <LayoutDashboard size={16} />
            Dashboard
          </div>

          <div
            onClick={() => setIsConnected(false)}
            className="btn-ghost"
            style={{
              justifyContent: 'flex-start', border: 'none',
              padding: '9px 12px', borderRadius: 10, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <FileUp size={16} />
            Fuente de Datos
          </div>
        </nav>

        {/* Status + disconnect */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="badge-success" style={{ justifyContent: 'flex-start', borderRadius: 8 }}>
            <span className="badge-dot" />
            Conectado
          </div>
          <button
            id="btn-disconnect"
            onClick={() => setIsConnected(false)}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 8, fontSize: 12 }}
            title="Cambiar fuente de datos"
          >
            <LogOut size={14} />
            Desconectar
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {/* Editable title */}
          <input
            className="bg-transparent border-none outline-none"
            style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
              background: 'transparent', border: 'none', outline: 'none',
              padding: 0, fontFamily: 'inherit', minWidth: 160,
            }}
            value={dashboard.title}
            onChange={e => setDashboard({ ...dashboard, title: e.target.value })}
            aria-label="Título del dashboard"
          />

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.button
              id="btn-refresh"
              whileTap={{ scale: 0.92 }}
              onClick={handleRefresh}
              className="btn-icon"
              title="Refrescar datos"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </motion.button>

            <button
              id="btn-save"
              onClick={() => saveDashboard(dashboard)}
              className="btn-icon"
              title="Guardar"
            >
              <motion.span animate={isSaving ? { scale: [1,1.25,1] } : {}} transition={{ duration: 0.4 }}>
                <Save size={16} style={{ color: isSaving ? 'var(--success)' : undefined }} />
              </motion.span>
            </button>

            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

            <motion.button
              id="btn-add-chart"
              whileTap={{ scale: 0.97 }}
              onClick={handleAddChart}
              disabled={dashboard.charts.length >= 6}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Plus size={15} />
              Nuevo análisis
            </motion.button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '32px 32px 48px' }}>

          {/* Page heading */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              {dashboard.charts.length === 0
                ? 'Todavía no hay análisis. Creá tu primer gráfico para empezar.'
                : `${dashboard.charts.length} análisis · actualizado ahora`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {dashboard.charts.length === 0 ? (
              /* ── EMPTY STATE ── */
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: 420, gap: 24, textAlign: 'center',
                }}
              >
                <div className="empty-icon-wrap">
                  <Layers size={32} style={{ color: 'var(--accent-from)' }} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Tu lienzo está listo.
                  </h3>
                  <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', maxWidth: 380 }}>
                    Agrega tu primer gráfico para transformar datos en decisiones.
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddChart}
                  className="btn-primary"
                  style={{ padding: '13px 28px', fontSize: 15 }}
                  id="btn-empty-start"
                >
                  <Plus size={18} />
                  Empezar con un gráfico
                </motion.button>
              </motion.div>
            ) : (
              /* ── CHART GRID ── */
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}
              >
                {dashboard.charts.map((chart, index) => (
                  <motion.div
                    key={chart.id}
                    layoutId={chart.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.45, ease: [0.25,0.1,0.25,1] }}
                    style={{ position: 'relative' }}
                    className="group"
                  >
                    <ChartRenderer config={chart} refreshKey={refreshKey} accentIndex={index % 6} />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setEditingChart(chart)}
                      className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        position: 'absolute', top: 12, right: 12,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)'
                      }}
                      title="Configurar"
                    >
                      <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
                    </motion.button>
                  </motion.div>
                ))}

                {/* Add slot */}
                {dashboard.charts.length < 6 && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddChart}
                    className="add-chart-slot"
                    id="btn-add-slot"
                  >
                    <div className="add-icon">
                      <Plus size={20} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Añadir análisis
                    </span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer style={{
          padding: '16px 32px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>Tablers · Análisis Visual de Datos</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <span className="cursor-pointer hover:text-indigo-400 transition-colors">Estado del Sistema</span>
            <span className="cursor-pointer hover:text-indigo-400 transition-colors">Documentación</span>
          </div>
        </footer>
      </div>

      {/* ── CONFIGURATOR DRAWER ── */}
      <AnimatePresence>
        {editingChart && (
          <React.Fragment key="drawer-fragment">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 40 }}
              onClick={() => setEditingChart(null)}
            />
            <ChartConfigurator
              key={editingChart.id}
              config={editingChart}
              onSave={handleSaveChart}
              onClose={() => setEditingChart(null)}
              onDelete={handleDeleteChart}
            />
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
