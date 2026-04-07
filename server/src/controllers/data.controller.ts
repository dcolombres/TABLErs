import { Request, Response } from 'express';
import db from '../services/db.service.js';
import fs from 'fs';
import path from 'path';
import { getIntrospectedSchema } from '../middleware/queryGuard.middleware.js'; // Import the schema introspector

const CONFIG_PATH = path.join(process.cwd(), 'dashboard_config.json');

// ── GET /api/tables ──────────────────────────────────────────
export const getTables = async (_req: Request, res: Response) => {
  try {
    const dataSources = await db('data_sources')
      .select('id', 'name', 'table_name')
      .whereNotIn('table_name', ['knex_migrations', 'knex_migrations_lock']); // Filter out internal tables
    res.json(dataSources);
  } catch (err: any) {
    console.error('getTables error:', err);
    res.status(500).json({ error: 'Error al obtener las fuentes de datos.' });
  }
};

// ── DELETE /api/table/:table ─────────────────────────────────
export const deleteTable = async (req: Request, res: Response) => {
  const { table } = req.params;

  try {
    const schema = await getIntrospectedSchema();

    // Prevent dropping protected tables if any
    const protectedTables = ['knex_migrations', 'knex_migrations_lock', 'data_sources'];
    if (table.startsWith('sqlite_') || protectedTables.includes(table)) {
      return res.status(403).json({ error: 'Cannot drop system or protected tables.' });
    }
    
    // Validate table name against introspected schema
    if (!schema[table]) {
      return res.status(404).json({ error: 'La tabla no existe o no está permitida.' });
    }

    // Use Knex's schema builder for dropping tables, which is safer
    // Ensure the table name is properly escaped by Knex
    await db.schema.dropTableIfExists(table); // Use dropTableIfExists for idempotency

    // Clear the cached schema so it's re-introspected next time
    (getIntrospectedSchema as any).clearCache();
    res.json({ message: `Fuente de datos '${table}' eliminada correctamente.` });
  } catch (err: any) {
    console.error('deleteTable error:', err);
    res.status(500).json({ error: 'Error al eliminar la fuente de datos.' });
  }
};

// ── GET /api/schema/:table ───────────────────────────────────
export const getSchema = async (req: Request, res: Response) => {
  const { table } = req.params;

  try {
    const introspectedSchema = await getIntrospectedSchema();

    // Validate table name against introspected schema
    if (!introspectedSchema[table]) {
      return res.status(404).json({ error: 'La tabla no existe o no está permitida.' });
    }

    // Retrieve schema directly from introspected data
    const info = introspectedSchema[table];
    const schema: Record<string, string> = {};
    for (const col of info) {
      schema[col.name] = col.type;
    }
    res.json(schema);
  } catch (err: any) {
    console.error('getSchema error:', err);
    res.status(500).json({ error: 'Error al obtener el esquema.' });
  }
};

// ── POST /api/query ──────────────────────────────────────────
// Body: { table, columns, aggregations, groupBy, filters }
export const queryData = async (req: Request, res: Response) => {
  const { table, columns, aggregations, groupBy, filters } = req.body;

  if (!table) {
    return res.status(400).json({ error: 'Se requiere el nombre de la tabla.' });
  }

  try {
    const schema = await getIntrospectedSchema();

    // Validate table name
    if (!schema[table]) {
      return res.status(400).json({ error: `Table '${table}' does not exist or is not allowed.` });
    }
    const allowedColumns = schema[table].map(col => col.name);

    let query = db(table); // Knex will escape the table name

    // Build SELECT clause
    const selectCols: any[] = [];
    if (columns?.length) {
      for (const col of columns) { // Validate columns
        if (!allowedColumns.includes(col)) {
          return res.status(400).json({ error: `Columna '${col}' no permitida.` });
        }
        selectCols.push(col);
      }
    }
    if (aggregations?.length) {
      for (const agg of aggregations) {
        const { column, func, alias } = agg; // func is now validated
        const validFuncs = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
        if (!column || !allowedColumns.includes(column)) { // Validate column for aggregation
          return res.status(400).json({ error: `Columna '${column}' no permitida para agregación.` });
        }
        // Whitelist aggregation function
        if (!validFuncs.includes(func?.toUpperCase())) {
          return res.status(400).json({ error: `Función de agregación '${func}' no válida.` });
        }
        selectCols.push(db.raw(`${func.toUpperCase()}("${column}") as "${alias || column}"`));
      }
    }
    if (selectCols.length) {
      query = query.select(selectCols as any);
    } else {
      query = query.select('*');
    }

    // GROUP BY
    if (groupBy?.length) {
      for (const col of groupBy) { // Validate group by columns
        if (!allowedColumns.includes(col)) {
          return res.status(400).json({ error: `Columna '${col}' no permitida para GROUP BY.` });
        }
      }
      query = query.groupBy(groupBy);
    }

    // Filters (WHERE)
    if (filters?.length) {
      for (const f of filters) {
        const { column: col, operator, value } = f; // operator is now validated
        const validOperators = ['=', '>', '<', 'LIKE', '!=', '>=', '<=']; // Whitelist operators
        if (!col || !allowedColumns.includes(col)) { // Validate column for filter
          return res.status(400).json({ error: `Columna '${col}' no permitida para filtro.` });
        }
        if (!operator || !validOperators.includes(operator.toUpperCase())) {
          return res.status(400).json({ error: `Operador '${operator}' no válido para filtro.` });
        }
        if (operator.toUpperCase() === 'LIKE') {
          query = query.where(col, 'like', `%${value}%`);
        } else {
          query = query.where(col, operator, value);
        }
      }
    }

    // Cap results for safety
    query = query.limit(1000);

    const result = await query;
    res.json(result);
  } catch (err: any) {
    console.error('queryData error:', err);
    res.status(500).json({ error: `Error en la consulta: ${err.message}` });
  }
};

// ── GET /api/dashboard/default ───────────────────────────────
export const getDashboardConfig = async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return res.status(404).json({ error: 'No hay configuración guardada.' });
    }
    const content = await fs.promises.readFile(CONFIG_PATH, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err: any) {
    console.error('getDashboardConfig error:', err);
    res.status(500).json({ error: 'Error al leer la configuración.' });
  }
};

// ── POST /api/dashboard/save ─────────────────────────────────
export const saveDashboardConfig = async (req: Request, res: Response) => {
  try {
    // Basic validation for dashboard config structure
    const { title, charts } = req.body;
    if (typeof title !== 'string' || !Array.isArray(charts)) {
      return res.status(400).json({ error: 'Estructura de configuración de dashboard inválida.' });
    }
    // Further validation for each chart in 'charts' array could be added here
    // For now, we'll just ensure it's a valid JSON structure

    // Sanitize req.body to only include expected fields if necessary
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify({ title, charts }, null, 2), 'utf-8');
    res.json({ message: 'Configuración guardada.' });
  } catch (err: any) {
    console.error('saveDashboardConfig error:', err);
    res.status(500).json({ error: 'Error al guardar la configuración.' });
  }
};

// ── POST /api/data (legacy) ──────────────────────────────────
export const getData = async (req: Request, res: Response) => {
  const { tableName, columns, where } = req.body;
  try {
    const schema = await getIntrospectedSchema();

    // Validate table name
    if (!schema[tableName]) {
      return res.status(400).json({ error: `Table '${tableName}' does not exist or is not allowed.` });
    }
    const allowedColumns = schema[tableName].map(col => col.name);

    let query = db(tableName); // Knex will escape the table name
    if (columns?.length) {
      for (const col of columns) { // Validate columns
        if (!allowedColumns.includes(col)) {
          return res.status(400).json({ error: `Columna '${col}' no permitida.` });
        }
      }
      query = query.select(columns);
    } else {
      query = query.select('*');
    }
    if (where && Object.keys(where).length) {
      for (const key in where) { // Validate columns in WHERE clause
        if (!allowedColumns.includes(key)) {
          return res.status(400).json({ error: `Columna '${key}' en WHERE clause no permitida.` });
        }
      }
      query = query.where(where);
    }
    res.json(await query);
  } catch (err: any) {
    console.error('getData error:', err);
    res.status(500).json({ error: 'Error al obtener datos.' });
  }
};
