import { Request, Response } from 'express';
import db from '../services/db.service.js';
import { Knex } from 'knex';
import { getSpreadsheetData } from '../services/googleSheets.service.js';
import { SuggestionService } from '../services/suggestion.service.js';

// Helper function to get data from a Knex instance
async function fetchDataFromKnex(knexInstance: Knex, tableName: string, limit: number = 100) {
  return knexInstance(tableName).select('*').limit(limit);
}

// GET /api/data-sources/:id/preview
export const getDataSourcePreview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = await db('data_sources').where({ id }).first();

    if (!dataSource) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada.' });
    }

    let data: any[] = [];
    let columns: string[] = [];

    switch (dataSource.type) {
      case 'csv':
      case 'excel':
      case 'sql_upload':
        // Data is in our local SQLite database
        data = await fetchDataFromKnex(db, dataSource.table_name);
        if (data.length > 0) {
          columns = Object.keys(data[0]);
        }
        break;

      case 'mysql':
      case 'pg':
      case 'sqlite':
        // Connect to external database
        const connectionDetails = JSON.parse(dataSource.connection_details);
        // @ts-ignore - knex import in ESM can be tricky with types
        const externalDb = (db.constructor as any)({
          client: connectionDetails.type === 'mysql' ? 'mysql2' : (connectionDetails.type === 'pg' ? 'pg' : 'sqlite3'),
          connection: connectionDetails.type === 'sqlite' ? { filename: connectionDetails.database } : {
            host: connectionDetails.host,
            port: connectionDetails.port,
            user: connectionDetails.user,
            password: connectionDetails.password,
            database: connectionDetails.database,
          },
          useNullAsDefault: connectionDetails.type === 'sqlite',
        });

        try {
          // For external DBs, we need a table name. For now, assume it's part of connection_details or a default.
          // This needs to be refined: the user should specify the table/query for external DBs.
          // For MVP, let's assume the 'name' of the data source is the table name for external DBs.
          data = await fetchDataFromKnex(externalDb, dataSource.name);
          if (data.length > 0) {
            columns = Object.keys(data[0]);
          }
        } catch (extDbError: any) {
          console.error('Error fetching data from external DB:', extDbError);
          return res.status(500).json({ error: `Error al obtener datos de la base de datos externa: ${extDbError.message}` });
        } finally {
          await externalDb.destroy();
        }
        break;

      case 'google_sheet':
        const googleSheetDetails = JSON.parse(dataSource.connection_details);
        // getSpreadsheetData expects spreadsheetId, range, and apiKey
        const googleApiKey = process.env.GOOGLE_API_KEY || '';
        const sheetData = await getSpreadsheetData(googleSheetDetails.spreadsheetId || dataSource.name, googleSheetDetails.range || 'A:Z', googleApiKey);
        if (sheetData && sheetData.length > 0) {
          columns = sheetData[0]; // Assume first row is headers
          data = sheetData.slice(1).map((row: string[]) => {
            const obj: any = {};
            columns.forEach((col, index) => {
              obj[col] = row[index];
            });
            return obj;
          });
        }
        break;

      default:
        return res.status(400).json({ error: 'Tipo de fuente de datos no soportado para previsualización.' });
    }

    res.status(200).json({ columns, data });

  } catch (error: any) {
    res.status(500).json({ error: `Error al obtener la previsualización de la fuente de datos: ${error.message}` });
  }
};

// POST /api/data-sources/:id/transform
export const transformDataSource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transformations } = req.body; // e.g., { firstRowAsHeaders: true, selectedColumns: ['col1', 'col2'] }

    const dataSource = await db('data_sources').where({ id }).first();

    if (!dataSource) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada.' });
    }

    let rawData: any[] = [];
    let originalColumns: string[] = [];

    // Fetch raw data based on data source type (similar to preview, but potentially more data)
    switch (dataSource.type) {
      case 'csv':
      case 'excel':
      case 'sql_upload':
        rawData = await db(dataSource.table_name).select('*');
        if (rawData.length > 0) {
          originalColumns = Object.keys(rawData[0]);
        }
        break;

      case 'mysql':
      case 'pg':
      case 'sqlite':
        const connectionDetails = JSON.parse(dataSource.connection_details);
        // @ts-ignore
        const externalDb = (db.constructor as any)({
          client: connectionDetails.type === 'mysql' ? 'mysql2' : (connectionDetails.type === 'pg' ? 'pg' : 'sqlite3'),
          connection: connectionDetails.type === 'sqlite' ? { filename: connectionDetails.database } : {
            host: connectionDetails.host,
            port: connectionDetails.port,
            user: connectionDetails.user,
            password: connectionDetails.password,
            database: connectionDetails.database,
          },
          useNullAsDefault: connectionDetails.type === 'sqlite',
        });
        try {
          rawData = await externalDb(dataSource.name).select('*'); // Assuming dataSource.name is the table name
          if (rawData.length > 0) {
            originalColumns = Object.keys(rawData[0]);
          }
        } finally {
          await externalDb.destroy();
        }
        break;

      case 'google_sheet':
        const googleSheetDetails = JSON.parse(dataSource.connection_details);
        const googleApiKey = process.env.GOOGLE_API_KEY || '';
        const sheetData = await getSpreadsheetData(googleSheetDetails.spreadsheetId || dataSource.name, googleSheetDetails.range || 'A:Z', googleApiKey);
        if (sheetData && sheetData.length > 0) {
          originalColumns = sheetData[0];
          rawData = sheetData.slice(1).map((row: string[]) => {
            const obj: any = {};
            originalColumns.forEach((col, index) => {
              obj[col] = row[index];
            });
            return obj;
          });
        }
        break;

      default:
        return res.status(400).json({ error: 'Tipo de fuente de datos no soportado para transformación.' });
    }

    let transformedData = [...rawData];
    let transformedColumns = [...originalColumns];

    // Apply transformations
    if (transformations?.firstRowAsHeaders && rawData.length > 0) {
      transformedColumns = Object.values(rawData[0]).map(h => String(h).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
      transformedData = rawData.slice(1).map(row => {
        const newRow: any = {};
        Object.values(row).forEach((value, index) => {
          if (transformedColumns[index]) {
            newRow[transformedColumns[index]] = value;
          }
        });
        return newRow;
      });
    }

    if (transformations?.selectedColumns && transformations.selectedColumns.length > 0) {
      transformedData = transformedData.map(row => {
        const newRow: any = {};
        transformations.selectedColumns.forEach((col: string) => {
          if (row.hasOwnProperty(col)) {
            newRow[col] = row[col];
          }
        });
        return newRow;
      });
      transformedColumns = transformations.selectedColumns;
    }

    res.status(200).json({ columns: transformedColumns, data: transformedData });

  } catch (error: any) {
    res.status(500).json({ error: `Error al transformar la fuente de datos: ${error.message}` });
  }
};

// GET /api/data-sources/:id/suggestions
export const getChartSuggestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = await db('data_sources').where({ id }).first();

    if (!dataSource) {
      return res.status(404).json({ error: 'Fuente de datos no encontrada.' });
    }

    let sampleData: any[] = [];
    let columns: string[] = [];
    // Handle multi-table strings by taking the first table for analysis
    const tableName = (dataSource.table_name || '').split(',')[0].trim();

    if (!tableName) {
      return res.status(400).json({ error: 'La fuente de datos no tiene tablas válidas para analizar.' });
    }

    // Fetch sample data (reusing a bit of preview logic)
    switch (dataSource.type) {
      case 'csv':
      case 'excel':
      case 'sql_upload':
        sampleData = await fetchDataFromKnex(db, tableName, 100);
        break;
      // Add other types if needed, for MVP we focus on local tables
      default:
        return res.status(400).json({ error: 'Tipo de fuente no soportado para sugerencias automáticas aún.' });
    }

    if (sampleData.length > 0) {
      columns = Object.keys(sampleData[0]);
    }

    const suggestions = SuggestionService.suggestCharts({
      columns,
      sampleData,
      tableName
    });

    res.status(200).json(suggestions);
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: `Error al generar sugerencias: ${error.message}` });
  }
};
// GET /api/tables/:tableName/suggestions
export const getTableSuggestions = async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    const sampleData = await fetchDataFromKnex(db, tableName, 100);
    const columns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];

    const suggestions = SuggestionService.suggestCharts({
      columns,
      sampleData,
      tableName
    });

    res.status(200).json(suggestions);
  } catch (error: any) {
    console.error('Error getting table suggestions:', error);
    res.status(500).json({ error: `Error al generar sugerencias para la tabla ${req.params.tableName}: ${error.message}` });
  }
};
