import React, { useState, useEffect } from 'react';
import api from '../lib/api';

interface DataSource {
  id: number;
  name: string;
  table_name: string;
}

interface DataSourceSelectorProps {
  onSelectTable?: (tableName: string) => void;
  onConnected?: () => void;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({ onSelectTable, onConnected }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ type: 'mysql', host: '', user: '', password: '', database: '' });
  const [loading, setLoading] = useState(false);
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'db' | 'gdrive'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [newDataSourceName, setNewDataSourceName] = useState(''); // New state for data source name

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setDataSources(res.data); // Now expects an array of DataSource objects
    } catch (e) {
      console.error('Error fetching data sources:', e);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!newDataSourceName.trim()) {
      setUploadStatus('✗ Por favor, ingresa un nombre para la fuente de datos.');
      return;
    }
    setLoading(true);
    setUploadStatus('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', newDataSourceName); // Append the new data source name
      // TODO: Implement dynamic dashboardId selection/creation. For now, using a placeholder.
      fd.append('dashboardId', '1'); // Placeholder dashboardId

      const resp = await api.post('/connect', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadStatus(`✓ ${resp.data.message}`);
      setNewDataSourceName(''); // Clear input after successful upload
      await fetchTables();
      onConnected?.();
    } catch (err: any) {
      setUploadStatus(`✗ ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post('/connect', formData);
      setUploadStatus(`✓ ${resp.data.message}`);
      await fetchTables();
      onConnected?.();
    } catch (err: any) {
      setUploadStatus(`✗ ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDriveSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post('/gdrive-sync', { gdriveUrl });
      setUploadStatus(`✓ Google Sheet sincronizado. Tabla: ${resp.data.tableName}`);
      setGdriveUrl('');
      await fetchTables();
      onConnected?.();
    } catch (err: any) {
      setUploadStatus(`✗ ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataSource = async (dataSourceId: number) => {
    if (!confirm(`¿Eliminar la fuente de datos? Esta acción también eliminará la tabla asociada.`)) return;
    try {
      await api.delete(`/data-sources/${dataSourceId}`);
      await fetchTables();
      if (selectedDataSourceId === dataSourceId) setSelectedDataSourceId(null);
    } catch (err: any) {
      alert(`Error: ${err?.response?.data?.error || err.message}`);
    }
  };

  const tabs = [
    { id: 'file' as const, label: '📁 Archivo SQL/CSV' },
    { id: 'db' as const, label: '🔌 Base de datos' },
    { id: 'gdrive' as const, label: '📊 Google Sheets' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Existing tables */}
      {dataSources.length > 0 && (
        <div style={{
          background: 'var(--bg-overlay)',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          padding: '16px',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Fuentes de datos disponibles
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dataSources.map(dataSource => (
              <div key={dataSource.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                background: selectedDataSourceId === dataSource.id ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                border: `1px solid ${selectedDataSourceId === dataSource.id ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onClick={() => { setSelectedDataSourceId(dataSource.id); onSelectTable?.(dataSource.table_name); }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: selectedDataSourceId === dataSource.id ? 'var(--accent-from)' : 'var(--text-primary)' }}>
                  {dataSource.name} ({dataSource.table_name})
                </span>
                <button
                  onClick={ev => { ev.stopPropagation(); handleDeleteDataSource(dataSource.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                  title="Eliminar"
                >×</button>
              </div>
            ))}
          </div>
          {selectedDataSourceId !== null && (
            <button
              className="btn-primary"
              style={{ marginTop: 14, width: '100%', padding: '10px', fontSize: 13 }}
              onClick={() => {
                const selectedDs = dataSources.find(ds => ds.id === selectedDataSourceId);
                if (selectedDs) onConnected?.();
              }}
            >
              Usar fuente "{dataSources.find(ds => ds.id === selectedDataSourceId)?.name}" →
            </button>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-overlay)', borderRadius: 10 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'file' && (
        <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Nombre de la fuente de datos
            </label>
            <input
              type="text"
              value={newDataSourceName}
              onChange={e => setNewDataSourceName(e.target.value)}
              placeholder="Ej: Ventas 2023"
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
                background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Archivo SQL, CSV o Excel
            </label>
            <input
              type="file"
              accept=".sql,.csv,.xls,.xlsx"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !file} style={{ padding: '11px', fontSize: 13 }}>
            {loading ? 'Procesando...' : 'Subir archivo'}
          </button>
        </form>
      )}

      {activeTab === 'db' && (
        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['host', 'user', 'password', 'database'] as const).map(field => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'capitalize' }}>
                  {field}
                </label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  value={formData[field]}
                  onChange={e => setFormData(f => ({ ...f, [field]: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
                    background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '11px', fontSize: 13 }}>
            {loading ? 'Conectando...' : 'Conectar base de datos'}
          </button>
        </form>
      )}

      {activeTab === 'gdrive' && (
        <form onSubmit={handleGoogleDriveSync} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              URL de Google Sheets (pública)
            </label>
            <input
              type="url"
              value={gdriveUrl}
              onChange={e => setGdriveUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
                background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '11px', fontSize: 13 }}>
            {loading ? 'Sincronizando...' : 'Sincronizar Google Sheets'}
          </button>
        </form>
      )}

      {/* Status message */}
      {uploadStatus && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: uploadStatus.startsWith('✓') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${uploadStatus.startsWith('✓') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: uploadStatus.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
        }}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default DataSourceSelector;
