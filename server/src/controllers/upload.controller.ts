import multer from 'multer';
import { Request, Response } from 'express';
import { upload, processSqlDump, processCsvExcel } from '../services/file.service.js';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import knex, { Knex } from 'knex'; // Added Knex import
import db from '../services/db.service.js'; // Import the db instance
import { clearSchemaCache } from '../middleware/queryGuard.middleware.js';

const unlinkAsync = promisify(fs.unlink);

const SQLITE_UPLOAD_DIR = path.join(process.cwd(), 'server', 'uploads');

/**
 * POST /api/connect
 * Handles two cases:
 *  1. multipart/form-data with a `file` field  → file upload (SQL / CSV / Excel)
 *  2. application/json with DB connection info  → direct database connection (postgres / mysql)
 */
export const connectSource = async (req: Request, res: Response) => {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    // ── FILE UPLOAD ──────────────────────────────────────────
    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
      }

      const { dashboardId, name: dataSourceName } = req.body; // Extract dashboardId and name

      if (!dashboardId || !dataSourceName) {
        await unlinkAsync(req.file.path); // Clean up uploaded file
        return res.status(400).json({ error: 'Faltan campos requeridos: dashboardId y name para la fuente de datos.' });
      }

      // Check if dashboardId exists
      const dashboardExists = await db('dashboards').where({ id: dashboardId }).first();
      if (!dashboardExists) {
        await unlinkAsync(req.file.path); // Clean up uploaded file
        return res.status(404).json({ error: `Dashboard con ID ${dashboardId} no encontrado.` });
      }

      const filePath = req.file.path;
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      const fileType = ext === 'sql' ? 'sql_upload' : (ext === 'csv' ? 'csv' : 'excel');

      try {
        let tableName: string;
        if (ext === 'sql') {
          tableName = await processSqlDump(filePath);
        } else if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
          tableName = await processCsvExcel(filePath);
        } else {
          await unlinkAsync(filePath);
          return res.status(400).json({ error: 'Tipo de archivo no soportado. Usar SQL, CSV o Excel.' });
        }

        // Store data source metadata in the database
        const [dataSourceId] = await db('data_sources').insert({
          dashboard_id: dashboardId,
          name: dataSourceName,
          type: fileType,
          table_name: tableName,
          connection_details: JSON.stringify({ originalFileName: req.file.originalname }), // Store original file name
        });

        clearSchemaCache();

        return res.status(200).json({
          message: `Archivo procesado y fuente de datos creada exitosamente.`,
          dataSourceId,
          tableName,
        });
      } catch (processingError: any) {
        console.error('Error procesando archivo:', processingError);
        try { await unlinkAsync(filePath); } catch { /* ignore */ }
        return res.status(500).json({ error: `Error al procesar el archivo: ${processingError.message}` });
      }
    });
  } else {
    // ── DIRECT DB CONNECTION ─────────────────────────────────
    // Body: { type, host, port, user, password, database, dashboardId, name }
    const { type, host, port, user, password, database, dashboardId, name: dataSourceName } = req.body;

    if (!dashboardId || !dataSourceName) {
      return res.status(400).json({ error: 'Faltan campos requeridos: dashboardId y name para la fuente de datos.' });
    }

    // Check if dashboardId exists
    const dashboardExists = await db('dashboards').where({ id: dashboardId }).first();
    if (!dashboardExists) {
      return res.status(404).json({ error: `Dashboard con ID ${dashboardId} no encontrado.` });
    }

    // 1. Whitelist allowed database types
    const allowedDbTypes = ['mysql', 'pg', 'sqlite'];
    if (!type || !allowedDbTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de base de datos no soportado.' });
    }

    let connectionDetails: any;
    let testDb: Knex;

    if (type !== 'sqlite') {
      if (!host || !database) {
        return res.status(400).json({ error: 'Faltan campos requeridos: host, database.' });
      }
      // Security check: Prevent Server-Side Request Forgery (SSRF) by blocking connections
      // to private IP ranges and localhost. This prevents the server from being used
      // to attack internal networks or itself.
      const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|0\.)/;
      if (privateIpRegex.test(host) || host === 'localhost') {
        return res.status(403).json({ error: 'Conexiones a hosts locales o IPs privadas no permitidas por seguridad.' });
      }
      connectionDetails = { host, port: Number(port), user, password, database };
      testDb = knex({
        client: type === 'mysql' ? 'mysql2' : 'pg',
        connection: connectionDetails,
      });
    } else { // type === 'sqlite'
      if (!database) {
        return res.status(400).json({ error: 'Falta el campo requerido: database (ruta del archivo SQLite).' });
      }
      // Security check: Ensure SQLite file path is within the designated upload directory
      // and does not contain path traversal sequences (e.g., '..').
      const resolvedPath = path.resolve(SQLITE_UPLOAD_DIR, database);
      if (!resolvedPath.startsWith(SQLITE_UPLOAD_DIR) || path.isAbsolute(database) || database.includes('..')) {
        return res.status(403).json({ error: 'Ruta de archivo SQLite inválida o no permitida. Debe estar dentro del directorio de cargas.' });
      }
      connectionDetails = { filename: resolvedPath };
      testDb = knex({
        client: 'sqlite3',
        connection: connectionDetails,
        useNullAsDefault: true,
      });
    }

    try {
      await testDb.raw('SELECT 1+1 AS result');

      // Store data source metadata in the database
      const [dataSourceId] = await db('data_sources').insert({
        dashboard_id: dashboardId,
        name: dataSourceName,
        type: type, // e.g., 'mysql', 'pg', 'sqlite'
        table_name: dataSourceName, // Use name as table name for external sources per MVP
        connection_details: JSON.stringify({ ...connectionDetails, type }), // Store all connection details including type
      });

      clearSchemaCache();

      return res.status(200).json({
        message: `Conexión exitosa y fuente de datos creada.`,
        dataSourceId,
      });
    } catch (err: any) {
      return res.status(500).json({ error: `No se pudo conectar o guardar la fuente de datos: ${err.message}` });
    } finally {
      testDb.destroy();
    }
  }
};
