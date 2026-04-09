import React, { useState, useEffect } from 'react';
import {
  createDashboard,
  getDashboards,
  deleteDashboard,
  uploadFileDataSource,
  connectDbDataSource,
  getDataSourcesByDashboardId,
  deleteDataSource,
} from './lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardItem {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface DataSourceItem {
  id: number;
  dashboard_id: number;
  name: string;
  type: string;
  table_name?: string;
  connection_details?: string;
  created_at: string;
  updated_at: string;
}

// ─── Icon primitives ─────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
const TrashIcon = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />;
const DbIcon = () => <Icon d="M12 2C7 2 3 4.7 3 8v8c0 3.3 4 6 9 6s9-2.7 9-6V8c0-3.3-4-6-9-6z" />;
const FileIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />;
const XIcon = () => <Icon d="M18 6 6 18M6 6l12 12" />;
const LayoutIcon = () => <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={20} />;

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed' as const, inset: 0,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  },
  card: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    borderRadius: 16, padding: 28, width: '100%',
  },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const,
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 },
  btnPrimary: {
    background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
    color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  btnGhost: {
    background: 'var(--bg-overlay)', color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)', borderRadius: 10,
    padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
    border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
    padding: '6px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  },
};

// ─── Tab bar ─────────────────────────────────────────────────────────────────
type DSType = 'file' | 'db';

const TabBar = ({ active, onChange }: { active: DSType; onChange: (t: DSType) => void }) => {
  const tabs: { id: DSType; label: string }[] = [
    { id: 'file', label: '📁 Archivo' },
    { id: 'db', label: '🔌 Base de datos' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-overlay)', borderRadius: 10, marginBottom: 18 }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          background: active === tab.id ? 'var(--bg-elevated)' : 'transparent',
          color: active === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'all 0.15s',
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ─── Add Data Source Modal ────────────────────────────────────────────────────
interface AddDataSourceModalProps {
  onClose: () => void;
  onAdded: () => void;
  dashboardId: number;
}

const AddDataSourceModal: React.FC<AddDataSourceModalProps> = ({ onClose, onAdded, dashboardId }) => {
  const [dsType, setDsType] = useState<DSType>('file');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dbDetails, setDbDetails] = useState({ type: 'mysql', host: '', port: '3306', user: '', password: '', database: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setStatus('⚠️ El nombre es obligatorio.'); return; }
    setLoading(true);
    setStatus('');
    try {
      if (dsType === 'file') {
        if (!file) { setStatus('⚠️ Seleccioná un archivo.'); return; }
        await uploadFileDataSource(dashboardId, name, file);
      } else {
        if (!dbDetails.host) { setStatus('⚠️ El host es obligatorio.'); return; }
        await connectDbDataSource(dashboardId, name, dbDetails);
      }
      setStatus('✓ Fuente de datos agregada.');
      setTimeout(() => { onAdded(); onClose(); }, 600);
    } catch (err: any) {
      setStatus(`✗ ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={{ ...s.card, maxWidth: 520 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Nueva fuente de datos
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={s.label}>Nombre de la fuente</label>
            <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ej. Ventas 2024" required />
          </div>

          {/* Tipo */}
          <TabBar active={dsType} onChange={setDsType} />

          {/* File tab */}
          {dsType === 'file' && (
            <div>
              <label style={s.label}>Archivo SQL, CSV o Excel</label>
              <input
                type="file"
                accept=".sql,.csv,.xls,.xlsx"
                onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ ...s.input, cursor: 'pointer' }}
              />
            </div>
          )}

          {/* DB tab */}
          {dsType === 'db' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div>
                  <label style={s.label}>Host</label>
                  <input style={s.input} type="text" value={dbDetails.host}
                    onChange={e => setDbDetails(d => ({ ...d, host: e.target.value }))} placeholder="localhost" />
                </div>
                <div style={{ width: 90 }}>
                  <label style={s.label}>Puerto</label>
                  <input style={s.input} type="text" value={dbDetails.port}
                    onChange={e => setDbDetails(d => ({ ...d, port: e.target.value }))} placeholder="3306" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(['user', 'password', 'database'] as const).map(field => (
                  <div key={field} style={field === 'database' ? { gridColumn: '1/-1' } : {}}>
                    <label style={s.label} className="capitalize">{field === 'user' ? 'Usuario' : field === 'password' ? 'Contraseña' : 'Base de datos'}</label>
                    <input
                      style={s.input}
                      type={field === 'password' ? 'password' : 'text'}
                      value={dbDetails[field]}
                      onChange={e => setDbDetails(d => ({ ...d, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label style={s.label}>Motor</label>
                <select
                  value={dbDetails.type}
                  onChange={e => setDbDetails(d => ({ ...d, type: e.target.value }))}
                  style={{ ...s.input }}
                >
                  <option value="mysql">MySQL / MariaDB</option>
                  <option value="postgres">PostgreSQL</option>
                </select>
              </div>
            </>
          )}

          {/* Status */}
          {status && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: status.startsWith('✓') ? 'rgba(16,185,129,0.1)' : status.startsWith('⚠') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${status.startsWith('✓') ? 'rgba(16,185,129,0.3)' : status.startsWith('⚠') ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: status.startsWith('✓') ? 'var(--success)' : status.startsWith('⚠') ? '#f59e0b' : 'var(--danger)',
            }}>
              {status}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={s.btnGhost}>Cancelar</button>
            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? 'Procesando...' : 'Agregar fuente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Dashboard Detail Modal ───────────────────────────────────────────────────
interface DashboardDetailModalProps {
  dashboard: DashboardItem;
  onClose: () => void;
  onDeleted: () => void;
  onOpen: () => void;
}

const DashboardDetailModal: React.FC<DashboardDetailModalProps> = ({ dashboard, onClose, onOpen }) => {
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchDS = async () => {
    try {
      setLoading(true);
      const res = await getDataSourcesByDashboardId(dashboard.id);
      setDataSources(res.data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDS(); }, []);

  const handleDeleteDS = async (id: number) => {
    if (!confirm('¿Eliminar esta fuente de datos?')) return;
    setDeletingId(id);
    try {
      await deleteDataSource(id);
      await fetchDS();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message);
    } finally { setDeletingId(null); }
  };

  const getTypeIcon = (type: string) =>
    type === 'file' ? <FileIcon /> : <DbIcon />;

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = { file: 'Archivo', db: 'Base de datos', google_sheet: 'Google Sheet' };
    const colors: Record<string, string> = {
      file: 'rgba(99,102,241,0.15)',
      db: 'rgba(16,185,129,0.15)',
      google_sheet: 'rgba(59,130,246,0.15)',
    };
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
        background: colors[type] || 'var(--bg-overlay)',
        color: 'var(--text-secondary)',
      }}>
        {labels[type] || type}
      </span>
    );
  };

  return (
    <>
      <div style={s.overlay}>
        <div style={{ ...s.card, maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                {dashboard.name}
              </h2>
              {dashboard.description && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  {dashboard.description}
                </p>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginTop: 2 }}>
              <XIcon />
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />

          {/* Data sources section */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Fuentes de datos
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ ...s.btnPrimary, padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <PlusIcon /> Agregar
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Cargando...
              </div>
            ) : dataSources.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 16px', borderRadius: 12,
                border: '2px dashed var(--border-subtle)', color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Sin fuentes de datos</p>
                <p style={{ margin: '6px 0 0', fontSize: 12 }}>Agregá archivos o conexiones a bases de datos.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dataSources.map(ds => (
                  <div key={ds.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'var(--accent-from)' }}>{getTypeIcon(ds.type)}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          {ds.name}
                        </p>
                        {ds.table_name && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            tabla: {ds.table_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {getTypeBadge(ds.type)}
                      <button
                        onClick={() => handleDeleteDS(ds.id)}
                        disabled={deletingId === ds.id}
                        style={s.btnDanger}
                        title="Eliminar fuente"
                      >
                        <TrashIcon /> {deletingId === ds.id ? '...' : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button onClick={onClose} style={s.btnGhost}>Cerrar</button>
            <button
              onClick={onOpen}
              style={{ ...s.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LayoutIcon /> Comenzar análisis →
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddDataSourceModal
          dashboardId={dashboard.id}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchDS}
        />
      )}
    </>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
interface DashboardProps {
  onOpenDashboard: (dashboard: DashboardItem) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenDashboard }) => {
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      const res = await getDashboards();
      setDashboards(res.data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los tableros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboards(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createDashboard(newName, newDesc);
      setNewName(''); setNewDesc('');
      setShowCreateModal(false);
      await fetchDashboards();
    } catch (err: any) {
      setError(err.message);
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este tablero y todas sus fuentes de datos?')) return;
    try {
      await deleteDashboard(id);
      await fetchDashboards();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 15 }}>
        Cargando tableros...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            Mis Tableros
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {dashboards.length} tablero{dashboards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ ...s.btnPrimary, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px' }}
        >
          <PlusIcon /> Nuevo tablero
        </button>
      </div>

      {/* Empty state */}
      {dashboards.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 32px', borderRadius: 16,
          border: '2px dashed var(--border-subtle)', color: 'var(--text-muted)',
        }}>
          <div style={{ marginBottom: 16, opacity: 0.5 }}><LayoutIcon /></div>
          <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 16 }}>Sin tableros</p>
          <p style={{ margin: 0, fontSize: 13 }}>Creá tu primer tablero para organizar tus datos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {dashboards.map(db => (
            <div
              key={db.id}
              onClick={() => setSelectedDashboard(db)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 14, padding: '20px 22px', cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-from)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: '#fff',
                }}>
                  <LayoutIcon />
                </div>
                <button
                  onClick={e => handleDelete(db.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--danger)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                  title="Eliminar tablero"
                >
                  <TrashIcon />
                </button>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {db.name}
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {db.description || 'Sin descripción'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(db.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div style={s.overlay}>
          <div style={{ ...s.card, maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Nuevo tablero
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XIcon />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={s.label}>Nombre *</label>
                <input
                  style={s.input} type="text" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ej. Ventas Q1 2024" required autoFocus
                />
              </div>
              <div>
                <label style={s.label}>Descripción (opcional)</label>
                <textarea
                  style={{ ...s.input, resize: 'vertical', minHeight: 72 }}
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Descripción del tablero..."
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={s.btnGhost}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={creating || !newName.trim()}>
                  {creating ? 'Creando...' : 'Crear tablero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard Detail Modal */}
      {selectedDashboard && (
        <DashboardDetailModal
          dashboard={selectedDashboard}
          onClose={() => setSelectedDashboard(null)}
          onDeleted={fetchDashboards}
          onOpen={() => onOpenDashboard(selectedDashboard)}
        />
      )}
    </div>
  );
};

export default Dashboard;
