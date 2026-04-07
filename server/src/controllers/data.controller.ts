import { Request, Response } from 'express';
import db from '../services/db.service.js';
import fs from 'fs';
import path from 'path';
import { getIntrospectedSchema, clearSchemaCache } from '../middleware/queryGuard.middleware.js'; // Import the schema introspector
import { Knex } from 'knex';
import knex from 'knex';

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
    clearSchemaCache();
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
    const dataSource = await db('data_sources').where({ table_name: table }).first();
    const isExternal = dataSource && ['mysql', 'pg', 'sqlite'].includes(dataSource.type);

    let schema: Record<string, string> = {};

    if (isExternal) {
      const conn = JSON.parse(dataSource.connection_details);
      const externalDb = knex({
        client: conn.type === 'mysql' ? 'mysql2' : (conn.type === 'pg' ? 'pg' : 'sqlite3'),
        connection: conn.type === 'sqlite' ? { filename: conn.database } : {
          host: conn.host,
          port: conn.port,
          user: conn.user,
          password: conn.password,
          database: conn.database,
        },
        useNullAsDefault: conn.type === 'sqlite',
      });

      try {
        // A minimal approach for MVP: query 1 row and infer columns, or use columnInfo()
        const columnsInfo = await externalDb(table).columnInfo();
        for (const colName in columnsInfo) {
           schema[colName] = columnsInfo[colName].type;
        }
      } finally {
        await externalDb.destroy();
      }
    } else {
      const introspectedSchema = await getIntrospectedSchema();

      // Validate table name against introspected schema
      if (!introspectedSchema[table]) {
        return res.status(404).json({ error: 'La tabla no existe o no está permitida.' });
      }

      // Retrieve schema directly from introspected data
      const info = introspectedSchema[table];
      for (const col of info) {
        schema[col.name] = col.type;
      }
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
    const dataSource = await db('data_sources').where({ table_name: table }).first();
    const isExternal = dataSource && ['mysql', 'pg', 'sqlite'].includes(dataSource.type);

    let queryDb = db;
    let externalDb = null;
    let actualTableName = table;

    if (isExternal) {
      const conn = JSON.parse(dataSource.connection_details);
      externalDb = knex({
        client: conn.type === 'mysql' ? 'mysql2' : (conn.type === 'pg' ? 'pg' : 'sqlite3'),
        connection: conn.type === 'sqlite' ? { filename: conn.database } : {
          host: conn.host,
          port: conn.port,
          user: conn.user,
          password: conn.password,
          database: conn.database,
        },
        useNullAsDefault: conn.type === 'sqlite',
      });
      queryDb = externalDb;
      // actualTableName = dataSource.name; // MVP approach: source name = table name
    }

    const schema = await getIntrospectedSchema();
    let allowedColumns: string[] = [];

    if (!isExternal) {
      if (!schema[table]) {
        return res.status(400).json({ error: `Table '${table}' does not exist or is not allowed.` });
      }
      allowedColumns = schema[table].map(col => col.name);
    }

    let query = queryDb(actualTableName); // Knex will escape the table name

    // Build SELECT clause
    const selectCols: any[] = [];
    if (columns?.length) {
      for (const col of columns) { // Validate columns
        if (!isExternal && !allowedColumns.includes(col)) {
          return res.status(400).json({ error: `Columna '${col}' no permitida.` });
        }
        selectCols.push(col);
      }
    }
    if (aggregations?.length) {
      for (const agg of aggregations) {
        const { column, func, alias } = agg; // func is now validated
        const validFuncs = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
        if (!isExternal && (!column || !allowedColumns.includes(column))) { // Validate column for aggregation
          return res.status(400).json({ error: `Columna '${column}' no permitida para agregación.` });
        }
        // Whitelist aggregation function
        if (!validFuncs.includes(func?.toUpperCase())) {
          return res.status(400).json({ error: `Función de agregación '${func}' no válida.` });
        }
        selectCols.push(queryDb.raw(`${func.toUpperCase()}("${column}") as "${alias || column}"`));
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
        if (!isExternal && !allowedColumns.includes(col)) {
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
        if (!isExternal && (!col || !allowedColumns.includes(col))) { // Validate column for filter
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

    try {
      const result = await query;
      res.json(result);
    } finally {
      if (externalDb) {
        await externalDb.destroy();
      }
    }
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
