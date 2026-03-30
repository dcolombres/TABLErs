import { Request, Response } from 'express';
import db from '../services/db.service';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'dashboard_config.json');

// ── GET /api/tables ──────────────────────────────────────────
export const getTables = async (_req: Request, res: Response) => {
  try {
    const query = await db.raw(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    // In knex sqlite, the result is directly an array of objects
    res.json(query.map((row: any) => row.name));
  } catch (err: any) {
    console.error('getTables error:', err);
    res.status(500).json({ error: 'Error al obtener las tablas.' });
  }
};

// ── DELETE /api/table/:table ─────────────────────────────────
export const deleteTable = async (req: Request, res: Response) => {
  const { table } = req.params;
  try {
    // Prevent dropping protected tables if any
    if (table.startsWith('sqlite_')) {
      return res.status(403).json({ error: 'Cannot drop system tables.' });
    }
    
    // Check if table exists
    const exists = await db.schema.hasTable(table);
    if (!exists) {
      return res.status(404).json({ error: 'La tabla no existe.' });
    }

    await db.schema.dropTable(table);
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
    const info = await db.raw(`PRAGMA table_info("${table}")`);
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

  if (!table) return res.status(400).json({ error: 'Se requiere el nombre de la tabla.' });

  try {
    let query = db(table);

    // Build SELECT clause
    const selectCols: any[] = [];
    if (columns?.length) {
      for (const col of columns) selectCols.push(col);
    }
    if (aggregations?.length) {
      for (const agg of aggregations) {
        const { column, func, alias } = agg;
        const validFuncs = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
        if (!validFuncs.includes(func?.toUpperCase())) continue;
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
      query = query.groupBy(groupBy);
    }

    // Filters (WHERE)
    if (filters?.length) {
      for (const f of filters) {
        const { column: col, operator, value } = f;
        if (!col || !operator) continue;
        if (operator === 'LIKE') {
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
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(req.body, null, 2), 'utf-8');
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
    let query = db(tableName);
    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.select('*');
    }
    if (where && Object.keys(where).length) {
      query = query.where(where);
    }
    res.json(await query);
  } catch (err: any) {
    console.error('getData error:', err);
    res.status(500).json({ error: 'Error al obtener datos.' });
  }
};
