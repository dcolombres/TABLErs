import multer from 'multer';
import { Request, Response } from 'express';
import { upload, processSqlDump, processCsvExcel } from '../services/file.service';
import { promisify } from 'util';
import fs from 'fs';
import knex from 'knex';

const unlinkAsync = promisify(fs.unlink);

/**
 * POST /api/connect
 * Handles two cases:
 *  1. multipart/form-data with a `file` field  → file upload (SQL / CSV / Excel)
 *  2. application/json with DB connection info  → direct database connection (postgres / mysql)
 */
export const connectSource = (req: Request, res: Response) => {
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

      const filePath = req.file.path;
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();

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

        return res.status(200).json({
          message: `Archivo procesado exitosamente. Tabla: ${tableName}`,
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
    // Body: { type, host, port, user, password, database }
    const { type, host, port, user, password, database } = req.body;

    if (type !== 'sqlite') {
      if (!type || !host || !database) {
        return res.status(400).json({ error: 'Faltan campos requeridos: type, host, database.' });
      }
    }

    const client = type === 'mysql' ? 'mysql2' : (type === 'sqlite' ? 'sqlite3' : 'pg');

    const testDb = knex({
      client,
      connection: type === 'sqlite' ? { filename: database } : { host, port: Number(port), user, password, database },
      useNullAsDefault: type === 'sqlite'
    });

    testDb.raw('SELECT 1+1 AS result')
      .then(() => {
        // TODO: persist this external connection config so subsequent queries use it
        return res.status(200).json({ message: `Conexión exitosa a ${type}://${host}:${port}/${database}` });
      })
      .catch((err: any) => {
        return res.status(500).json({ error: `No se pudo conectar: ${err.message}` });
      })
      .finally(() => {
        testDb.destroy();
      });
  }
};
