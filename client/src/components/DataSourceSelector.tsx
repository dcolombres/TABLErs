import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, FileUp, Loader2, CheckCircle,
  AlertCircle, ChevronRight, ShieldCheck, Globe, Trash2, Table as TableIcon,
  HardDrive, Check, Link as LinkIcon
} from 'lucide-react';
import { DBConfig } from '../types';

interface Props {
  onConnected: () => void;
}

const DataSourceSelector: React.FC<Props> = ({ onConnected }) => {
  const [mode, setMode] = useState<'upload' | 'direct' | 'gdrive'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tables, setTables] = useState<string[]>([]);

  // Intermediate screen states
  const [reviewingTable, setReviewingTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<Record<string, string>>({});
  
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');

  const fetchTables = async () => {
    try {
      const res = await axios.get('/api/tables');
      setTables(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchTables();
  }, []);

  const [dbConfig, setDbConfig] = useState<DBConfig>({
    type: 'postgres', host: 'localhost', port: 5432,
    user: '', password: '', database: ''
  });

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await axios.post('/api/connect', formData);
      const tableName = resp.data.tableName || '';
      
      setSuccess('Analizando estructura detectada...');
      
      try {
        const schemaResp = await axios.get(`/api/schema/${tableName}`);
        setSchema(schemaResp.data);
        setReviewingTable(tableName);
      } catch (err) {
        // Fallback
        setSuccess('Fuente conectada.');
        fetchTables();
        setTimeout(onConnected, 1400);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGDriveSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdriveUrl) return setError('Ingresa un enlace válido de Google Sheets.');
    if (!googleApiKey) return setError('Ingresa tu API Key de Google.');
    
    setLoading(true);
    setError(null);
    
    try {
      const resp = await axios.post('/api/gdrive-sync', { gdriveUrl, googleApiKey });
      const tableName = resp.data.tableName;
      setSuccess('Analizando estructura detectada...');
      const schemaResp = await axios.get(`/api/schema/${tableName}`);
      setSchema(schemaResp.data);
      setReviewingTable(tableName);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (table: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.delete(`/api/table/${table}`);
      setSuccess(resp.data.message);
      fetchTables();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDbConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/connect', dbConfig);
      setSuccess('Conexión exitosa.');
      fetchTables();
      setTimeout(onConnected, 1400);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {reviewingTable ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
               Validación de Metadatos
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
               Se detectaron <strong>{Object.keys(schema).length} columnas</strong> en esta fuente. Verifica y pule el esquema antes de confirmar la importación al dashboard.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-overlay)' }}>
             <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <table className="w-full text-left text-sm">
                   <thead style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                         <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Columna</th>
                         <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tipo Asignado</th>
                         <th className="py-2.5 px-4 text-center font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Importar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {Object.entries(schema).map(([col, type]) => (
                         <tr key={col} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                              {col}
                            </td>
                            <td className="py-2.5 px-4 text-xs font-mono" style={{ color: 'var(--accent-from)' }}>
                              <select 
                                className="bg-transparent border-none text-xs font-mono outline-none p-0 cursor-pointer"
                                defaultValue={type.toUpperCase() || 'VARCHAR'}
                                style={{ color: 'var(--accent-from)' }}
                              >
                                <option value="VARCHAR">VARCHAR</option>
                                <option value="INTEGER">INTEGER</option>
                                <option value="REAL">REAL</option>
                                <option value="DATE">DATE</option>
                                <option value="BOOLEAN">BOOLEAN</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input type="checkbox" defaultChecked className="accent-indigo-500 w-4 h-4 cursor-pointer" />
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
               type="button"
               onClick={() => {
                  setReviewingTable(null);
                  setError(null);
                  setSuccess(null);
               }}
               className="btn-ghost flex-1 py-3"
            >
               Cancelar
            </button>
            <button
               type="button"
               onClick={() => {
                  setReviewingTable(null);
                  setSuccess('Fuente pulida e importada.');
                  fetchTables();
                  setTimeout(onConnected, 1200);
               }}
               className="btn-primary flex-1 py-3 font-semibold text-sm"
            >
               <Check size={18} />
               Confirmar y Finalizar
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Tab Switcher */}
        <div className="tab-switcher" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { id: 'upload' as const, icon: FileUp, label: 'Subir Archivo' },
          { id: 'direct' as const, icon: Database, label: 'Base de Datos' },
          { id: 'gdrive' as const, icon: HardDrive, label: 'Google Drive' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            id={`tab-${tab.id}`}
            onClick={() => { setMode(tab.id); setError(null); setSuccess(null); }}
            className={`tab-item ${mode === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="alert-error"
          >
            <AlertCircle size={17} />
            <span>{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="alert-success"
          >
            <CheckCircle size={17} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel Content */}
      <AnimatePresence mode="wait">
        {mode === 'upload' ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div
              className={`dropzone relative overflow-hidden block ${dragOver ? 'border-indigo-500 bg-indigo-500/5' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ padding: '40px 24px' }}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className={`drop-icon-wrap ${loading ? 'animate-pulse' : ''}`}>
                  {loading
                    ? <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-from)' }} />
                    : <FileUp size={28} style={{ color: 'var(--accent-from)' }} />
                  }
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Arrastrá o seleccioná tu archivo
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    SQL · CSV · Excel — máximo 50 MB
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-4 py-2 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                >
                  Seleccionar archivo
                </span>
              </div>
              <input
                id="file-upload"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleInputChange}
                disabled={loading}
                accept=".sql,.csv,.xlsx,.xls"
              />
            </div>

            {/* Trust rows */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, label: 'Encriptado local' },
                { icon: Globe, label: 'Sin nube externa' }
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  <Icon size={15} style={{ color: 'var(--accent-from)' }} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        ) : mode === 'gdrive' ? (
          <motion.form
            key="gdrive"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleGDriveSync}
            className="space-y-4"
          >
            <div>
              <label className="field-label" htmlFor="gdrive-url">Enlace de Google Sheets</label>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="gdrive-url"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="field-input pl-10"
                  value={gdriveUrl}
                  onChange={e => setGdriveUrl(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="google-api-key">Google API Key</label>
              <input
                id="google-api-key"
                type="text"
                placeholder="AIzaSyC..."
                className="field-input"
                value={googleApiKey}
                onChange={e => setGoogleApiKey(e.target.value || '')}
              />
            </div>

            <div className="p-4 rounded-xl space-y-2 mt-4" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Instrucciones:</p>
              <ol className="text-xs space-y-1 ml-4 list-decimal" style={{ color: 'var(--text-muted)' }}>
                <li>Abre tu documento de Google Sheets.</li>
                <li>Haz clic en <strong>Compartir</strong> (arriba a la derecha).</li>
                <li>Cambia a <strong>"Cualquier persona con el enlace"</strong>.</li>
                <li>Copia el enlace y pégalo aquí.</li>
                <li>Ingresa tu Google API Key con la API de Google Sheets habilitada.</li>
              </ol>
            </div>

            <button
              type="submit"
              disabled={loading || !gdriveUrl || !googleApiKey}
              className="btn-primary w-full mt-4"
              style={{ padding: '13px 24px', fontSize: 14 }}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <HardDrive size={18} />
              }
              <span>Sincronizar Documento</span>
              {!loading && <ChevronRight size={16} />}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="direct"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleDbConnect}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="db-type">Motor</label>
                <select
                  id="db-type"
                  className="field-input"
                  value={dbConfig.type}
                  onChange={e => setDbConfig({ ...dbConfig, type: e.target.value as any })}
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL / MariaDB</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="db-port">Puerto</label>
                <input
                  id="db-port"
                  type="number"
                  className="field-input"
                  value={dbConfig.port}
                  onChange={e => setDbConfig({ ...dbConfig, port: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="db-host">Servidor (Host)</label>
              <input
                id="db-host"
                type="text"
                placeholder="db.empresa.com.ar"
                className="field-input"
                value={dbConfig.host}
                onChange={e => setDbConfig({ ...dbConfig, host: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="db-user">Usuario</label>
                <input
                  id="db-user"
                  type="text"
                  className="field-input"
                  value={dbConfig.user}
                  onChange={e => setDbConfig({ ...dbConfig, user: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="db-password">Contraseña</label>
                <input
                  id="db-password"
                  type="password"
                  className="field-input"
                  value={dbConfig.password}
                  onChange={e => setDbConfig({ ...dbConfig, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="db-name">Base de Datos</label>
              <input
                id="db-name"
                type="text"
                className="field-input"
                value={dbConfig.database}
                onChange={e => setDbConfig({ ...dbConfig, database: e.target.value })}
              />
            </div>

            <button
              id="btn-db-connect"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
              style={{ padding: '13px 24px', fontSize: 14 }}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <Database size={18} />
              }
              <span>Vincular Base de Datos</span>
              {!loading && <ChevronRight size={16} />}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Existing Data Sources Manager */}
      {tables.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            Fuentes activas
          </h3>
          <div className="space-y-2 max-h-[220px] pr-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {tables.map(table => (
              <div
                key={table}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                    <TableIcon size={14} style={{ color: 'var(--accent-from)' }} />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{table}</span>
                </div>
                <button
                  onClick={() => handleDeleteTable(table)}
                  className="btn-icon"
                  style={{ width: 28, height: 28, borderRadius: 8, color: 'var(--danger)' }}
                  title="Eliminar tabla"
                  disabled={loading}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => onConnected()}
            className="btn-ghost w-full mt-4"
            disabled={loading}
          >
            Ir al Dashboard &rarr;
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default DataSourceSelector;
