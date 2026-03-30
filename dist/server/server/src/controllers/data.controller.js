"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = exports.saveDashboardConfig = exports.getDashboardConfig = exports.queryData = exports.getSchema = exports.deleteTable = exports.getTables = void 0;
const db_service_1 = __importDefault(require("../services/db.service"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_PATH = path_1.default.join(process.cwd(), 'dashboard_config.json');
// ── GET /api/tables ──────────────────────────────────────────
const getTables = async (_req, res) => {
    try {
        const query = await db_service_1.default.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
        // In knex sqlite, the result is directly an array of objects
        res.json(query.map((row) => row.name));
    }
    catch (err) {
        console.error('getTables error:', err);
        res.status(500).json({ error: 'Error al obtener las tablas.' });
    }
};
exports.getTables = getTables;
// ── DELETE /api/table/:table ─────────────────────────────────
const deleteTable = async (req, res) => {
    const { table } = req.params;
    try {
        // Prevent dropping protected tables if any
        if (table.startsWith('sqlite_')) {
            return res.status(403).json({ error: 'Cannot drop system tables.' });
        }
        // Check if table exists
        const exists = await db_service_1.default.schema.hasTable(table);
        if (!exists) {
            return res.status(404).json({ error: 'La tabla no existe.' });
        }
        await db_service_1.default.schema.dropTable(table);
        res.json({ message: `Fuente de datos '${table}' eliminada correctamente.` });
    }
    catch (err) {
        console.error('deleteTable error:', err);
        res.status(500).json({ error: 'Error al eliminar la fuente de datos.' });
    }
};
exports.deleteTable = deleteTable;
// ── GET /api/schema/:table ───────────────────────────────────
const getSchema = async (req, res) => {
    const { table } = req.params;
    try {
        const info = await db_service_1.default.raw(`PRAGMA table_info("${table}")`);
        const schema = {};
        for (const col of info) {
            schema[col.name] = col.type;
        }
        res.json(schema);
    }
    catch (err) {
        console.error('getSchema error:', err);
        res.status(500).json({ error: 'Error al obtener el esquema.' });
    }
};
exports.getSchema = getSchema;
// ── POST /api/query ──────────────────────────────────────────
// Body: { table, columns, aggregations, groupBy, filters }
const queryData = async (req, res) => {
    const { table, columns, aggregations, groupBy, filters } = req.body;
    if (!table)
        return res.status(400).json({ error: 'Se requiere el nombre de la tabla.' });
    try {
        let query = (0, db_service_1.default)(table);
        // Build SELECT clause
        const selectCols = [];
        if (columns?.length) {
            for (const col of columns)
                selectCols.push(col);
        }
        if (aggregations?.length) {
            for (const agg of aggregations) {
                const { column, func, alias } = agg;
                const validFuncs = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
                if (!validFuncs.includes(func?.toUpperCase()))
                    continue;
                selectCols.push(db_service_1.default.raw(`${func.toUpperCase()}("${column}") as "${alias || column}"`));
            }
        }
        if (selectCols.length) {
            query = query.select(selectCols);
        }
        else {
            query = query.select('*');
        }
        // GROUP BY
        if (groupBy?.length) {
            query = query.groupBy(groupBy);
        }
        // Filters (WHERE)
        if (filters?.length) {
            for (const f of filters) {
                const { column: col, operator, value } = f;
                if (!col || !operator)
                    continue;
                if (operator === 'LIKE') {
                    query = query.where(col, 'like', `%${value}%`);
                }
                else {
                    query = query.where(col, operator, value);
                }
            }
        }
        // Cap results for safety
        query = query.limit(1000);
        const result = await query;
        res.json(result);
    }
    catch (err) {
        console.error('queryData error:', err);
        res.status(500).json({ error: `Error en la consulta: ${err.message}` });
    }
};
exports.queryData = queryData;
// ── GET /api/dashboard/default ───────────────────────────────
const getDashboardConfig = async (_req, res) => {
    try {
        if (!fs_1.default.existsSync(CONFIG_PATH)) {
            return res.status(404).json({ error: 'No hay configuración guardada.' });
        }
        const content = await fs_1.default.promises.readFile(CONFIG_PATH, 'utf-8');
        res.json(JSON.parse(content));
    }
    catch (err) {
        console.error('getDashboardConfig error:', err);
        res.status(500).json({ error: 'Error al leer la configuración.' });
    }
};
exports.getDashboardConfig = getDashboardConfig;
// ── POST /api/dashboard/save ─────────────────────────────────
const saveDashboardConfig = async (req, res) => {
    try {
        await fs_1.default.promises.writeFile(CONFIG_PATH, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ message: 'Configuración guardada.' });
    }
    catch (err) {
        console.error('saveDashboardConfig error:', err);
        res.status(500).json({ error: 'Error al guardar la configuración.' });
    }
};
exports.saveDashboardConfig = saveDashboardConfig;
// ── POST /api/data (legacy) ──────────────────────────────────
const getData = async (req, res) => {
    const { tableName, columns, where } = req.body;
    try {
        let query = (0, db_service_1.default)(tableName);
        if (columns?.length) {
            query = query.select(columns);
        }
        else {
            query = query.select('*');
        }
        if (where && Object.keys(where).length) {
            query = query.where(where);
        }
        res.json(await query);
    }
    catch (err) {
        console.error('getData error:', err);
        res.status(500).json({ error: 'Error al obtener datos.' });
    }
};
exports.getData = getData;
