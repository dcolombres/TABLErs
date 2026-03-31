import { Request, Response, NextFunction } from 'express';
import db from '../services/db.service';

interface ColumnInfo {
  name: string;
  type: string;
}

interface TableSchema {
  [tableName: string]: ColumnInfo[];
}

let introspectedSchema: TableSchema | null = null;

/**
 * Introspects the SQLite database to get all user-defined tables and their columns.
 * Caches the schema for performance.
 */
async function getIntrospectedSchema(): Promise<TableSchema> {
  if (introspectedSchema) {
    return introspectedSchema;
  }

  const schema: TableSchema = {};

  // Get all user tables (excluding sqlite_sequence and internal tables)
  const tables = await db('sqlite_master')
    .select('name')
    .where('type', 'table')
    .where('name', 'not like', 'sqlite_%');

  for (const table of tables) {
    const tableName = table.name;
    const columnsInfo = await db.raw(`PRAGMA table_info(${tableName})`);
    schema[tableName] = columnsInfo.map((col: any) => ({
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
export const queryGuardMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { tableName, columns, aggregations, groupBy, filters, where } = req.body; // Assuming these are sent from frontend

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
      for (const column of columns) {
        if (!allowedColumns.includes(column)) {
          return res.status(400).json({ error: `Columna '${column}' no permitida para la tabla '${tableName}'.` });
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
      for (const column of groupBy) {
        if (!allowedColumns.includes(column)) {
          return res.status(400).json({ error: `Columna '${column}' no permitida para GROUP BY.` });
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
          return res.status(400).json({ error: `Operador '${operator}' no válido para filtro.` });
        }
      }
    }

    // 6. Validate columns in WHERE clause (assuming simple object for now) - this is for the legacy getData endpoint
    if (where && typeof where === 'object') {
      for (const key in where) {
        if (!allowedColumns.includes(key)) {
          return res.status(400).json({ error: `Columna '${key}' en WHERE clause no permitida.` });
        }
      }
    }

    // If all checks pass, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Error in Query Guard middleware:', error);
    return res.status(500).json({ error: 'Internal server error during query validation.' });
  }
};