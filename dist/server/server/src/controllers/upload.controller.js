"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSource = void 0;
const multer_1 = __importDefault(require("multer"));
const file_service_1 = require("../services/file.service");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const knex_1 = __importDefault(require("knex"));
const unlinkAsync = (0, util_1.promisify)(fs_1.default.unlink);
/**
 * POST /api/connect
 * Handles two cases:
 *  1. multipart/form-data with a `file` field  → file upload (SQL / CSV / Excel)
 *  2. application/json with DB connection info  → direct database connection (postgres / mysql)
 */
const connectSource = (req, res) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        // ── FILE UPLOAD ──────────────────────────────────────────
        file_service_1.upload.single('file')(req, res, async (err) => {
            if (err instanceof multer_1.default.MulterError) {
                return res.status(400).json({ error: err.message });
            }
            else if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'No se recibió ningún archivo.' });
            }
            const filePath = req.file.path;
            const ext = req.file.originalname.split('.').pop()?.toLowerCase();
            try {
                let tableName;
                if (ext === 'sql') {
                    tableName = await (0, file_service_1.processSqlDump)(filePath);
                }
                else if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
                    tableName = await (0, file_service_1.processCsvExcel)(filePath);
                }
                else {
                    await unlinkAsync(filePath);
                    return res.status(400).json({ error: 'Tipo de archivo no soportado. Usar SQL, CSV o Excel.' });
                }
                return res.status(200).json({
                    message: `Archivo procesado exitosamente. Tabla: ${tableName}`,
                    tableName,
                });
            }
            catch (processingError) {
                console.error('Error procesando archivo:', processingError);
                try {
                    await unlinkAsync(filePath);
                }
                catch { /* ignore */ }
                return res.status(500).json({ error: `Error al procesar el archivo: ${processingError.message}` });
            }
        });
    }
    else {
        // ── DIRECT DB CONNECTION ─────────────────────────────────
        // Body: { type, host, port, user, password, database }
        const { type, host, port, user, password, database } = req.body;
        if (type !== 'sqlite') {
            if (!type || !host || !database) {
                return res.status(400).json({ error: 'Faltan campos requeridos: type, host, database.' });
            }
        }
        const client = type === 'mysql' ? 'mysql2' : (type === 'sqlite' ? 'sqlite3' : 'pg');
        const testDb = (0, knex_1.default)({
            client,
            connection: type === 'sqlite' ? { filename: database } : { host, port: Number(port), user, password, database },
            useNullAsDefault: type === 'sqlite'
        });
        testDb.raw('SELECT 1+1 AS result')
            .then(() => {
            // TODO: persist this external connection config so subsequent queries use it
            return res.status(200).json({ message: `Conexión exitosa a ${type}://${host}:${port}/${database}` });
        })
            .catch((err) => {
            return res.status(500).json({ error: `No se pudo conectar: ${err.message}` });
        })
            .finally(() => {
            testDb.destroy();
        });
    }
};
exports.connectSource = connectSource;
