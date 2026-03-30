"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryGuardMiddleware = void 0;
const db_service_1 = __importDefault(require("../services/db.service"));
let introspectedSchema = null;
/**
 * Introspects the SQLite database to get all user-defined tables and their columns.
 * Caches the schema for performance.
 */
async function getIntrospectedSchema() {
    if (introspectedSchema) {
        return introspectedSchema;
    }
    const schema = {};
    // Get all user tables (excluding sqlite_sequence and internal tables)
    const tables = await (0, db_service_1.default)('sqlite_master')
        .select('name')
        .where('type', 'table')
        .where('name', 'not like', 'sqlite_%');
    for (const table of tables) {
        const tableName = table.name;
        const columnsInfo = await db_service_1.default.raw(`PRAGMA table_info(${tableName})`);
        schema[tableName] = columnsInfo.map((col) => ({
            name: col.name,
            type: col.type,
        }));
    }
    introspectedSchema = schema;
    return schema;
}
/**
 * Middleware to validate dynamic queries from the frontend against the database schema.
 * Prevents SQL Injection by whitelisting table and column names.
 */
const queryGuardMiddleware = async (req, res, next) => {
    const { tableName, columns, where } = req.body; // Assuming these are sent from frontend
    if (!tableName) {
        return res.status(400).json({ error: 'Table name is required.' });
    }
    try {
        const schema = await getIntrospectedSchema();
        // 1. Validate table name
        if (!schema[tableName]) {
            return res.status(400).json({ error: `Table '${tableName}' does not exist or is not allowed.` });
        }
        const allowedColumns = schema[tableName].map(col => col.name);
        // 2. Validate requested columns
        if (columns && Array.isArray(columns)) {
            for (const col of columns) {
                if (!allowedColumns.includes(col)) {
                    return res.status(400).json({ error: `Column '${col}' not allowed for table '${tableName}'.` });
                }
            }
        }
        // 3. Validate columns in WHERE clause (assuming simple object for now)
        if (where && typeof where === 'object') {
            for (const key in where) {
                if (!allowedColumns.includes(key)) {
                    return res.status(400).json({ error: `Column '${key}' in WHERE clause not allowed for table '${tableName}'.` });
                }
            }
        }
        // If all checks pass, proceed to the next middleware/route handler
        next();
    }
    catch (error) {
        console.error('Error in Query Guard middleware:', error);
        return res.status(500).json({ error: 'Internal server error during query validation.' });
    }
};
exports.queryGuardMiddleware = queryGuardMiddleware;
