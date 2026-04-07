import { Request, Response, NextFunction } from 'express';
import db from '../services/db.service.js';

interface ColumnInfo {
  name: string;
  type: string;
}

interface TableSchema {
  [tableName: string]: ColumnInfo[];
}

let introspectedSchema: TableSchema | null = null;

export function clearSchemaCache() {
  introspectedSchema = null;
}

/**
 * Introspects the local SQLite database to get all user-defined tables and their columns.
 * Caches the schema for performance. Excludes internal/system tables.
 */
export async function getIntrospectedSchema(): Promise<TableSchema> {
  if (introspectedSchema) {
    return introspectedSchema;
  }

  const schema: TableSchema = {};
  const excluded = ['knex_migrations', 'knex_migrations_lock', 'data_sources', 'dashboards'];

  const tables = await db('sqlite_master')
    .select('name')
    .where('type', 'table')
    .where('name', 'not like', 'sqlite_%')
    .whereNotIn('name', excluded);

  for (const table of tables) {
    const tableName = table.name;
    const columnsInfo = await db.raw(`PRAGMA table_info("${tableName}")`);
    schema[tableName] = columnsInfo.map((col: any) => ({
      name: col.name,
      type: col.type,
    }));
  }

  introspectedSchema = schema;
  return schema;
}

/**
 * Resolves the target table name from the request.
 * Priority: req.body.table > req.body.tableName > req.params.table > req.params.tableName
 */
function resolveTableName(req: Request): string | undefined {
  return (
    req.body?.table ||
    req.body?.tableName ||
    req.params?.table ||
    req.params?.tableName
  );
}

/**
 * Middleware to validate dynamic queries against the local SQLite schema.
 * - For external DB sources (mysql, pg, sqlite type), bypasses local validation.
 * - For local sources, whitelists table name + column names to prevent SQLi.
 */
export const queryGuardMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const tableName = resolveTableName(req);

  if (!tableName) {
    return next(); // No table involved, let the controller handle it
  }

  try {
    // Check if this is an external data source — bypass local schema validation
    let dataSource = await db('data_sources').where({ table_name: tableName }).first();
    if (!dataSource) {
      // If not found by table_name, try finding by name (for external sources where name might be used as identifier)
      dataSource = await db('data_sources').where({ name: tableName }).first();
    }
    const isExternal = dataSource && ['mysql', 'pg', 'sqlite'].includes(dataSource.type);

    if (isExternal) {
      return next(); // External source: connection/validation handled by the controller
    }

    const schema = await getIntrospectedSchema();

    // 1. Validate table name (must exist in local SQLite)
    if (!schema[tableName]) {
      return res.status(400).json({ error: `Tabla '${tableName}' no existe o no está permitida.` });
    }

    const allowedColumns = schema[tableName].map(col => col.name);
    const { columns, aggregations, groupBy, filters, where } = req.body;

    // 2. Validate requested columns
    if (columns && Array.isArray(columns)) {
      for (const column of columns) {
        if (!allowedColumns.includes(column)) {
          return res.status(400).json({ error: `Columna '${column}' no permitida para '${tableName}'.` });
        }
      }
    }

    // 3. Validate aggregations
    if (aggregations && Array.isArray(aggregations)) {
      const validFuncs = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
      for (const agg of aggregations) {
        const { column, func } = agg;
        if (!column || !allowedColumns.includes(column)) {
          return res.status(400).json({ error: `Columna '${column}' no permitida para agregación.` });
        }
        if (!func || !validFuncs.includes(func.toUpperCase())) {
          return res.status(400).json({ error: `Función de agregación '${func}' no válida.` });
        }
      }
    }

    // 4. Validate groupBy columns
    if (groupBy && Array.isArray(groupBy)) {
      for (const col of groupBy) {
        if (!allowedColumns.includes(col)) {
          return res.status(400).json({ error: `Columna '${col}' no permitida para GROUP BY.` });
        }
      }
    }

    // 5. Validate filters
    if (filters && Array.isArray(filters)) {
      const validOperators = ['=', '>', '<', 'LIKE', '!=', '>=', '<='];
      for (const filter of filters) {
        const { column, operator } = filter;
        if (!column || !allowedColumns.includes(column)) {
          return res.status(400).json({ error: `Columna '${column}' no permitida para filtro.` });
        }
        if (!operator || !validOperators.includes(operator.toUpperCase())) {
          return res.status(400).json({ error: `Operador '${operator}' no válido.` });
        }
      }
    }

    // 6. Validate legacy WHERE clause (simple object)
    if (where && typeof where === 'object') {
      for (const key in where) {
        if (!allowedColumns.includes(key)) {
          return res.status(400).json({ error: `Columna '${key}' en WHERE no permitida.` });
        }
      }
    }

    next();
  } catch (error) {
    console.error('[queryGuard] Error:', error);
    return res.status(500).json({ error: 'Error interno durante la validación de la consulta.' });
  }
};