import db from '../services/db.service.js';
import { getSpreadsheetData } from '../services/googleSheets.service.js';
// Helper function to get data from a Knex instance
async function fetchDataFromKnex(knexInstance, tableName, limit = 100) {
    return knexInstance(tableName).select('*').limit(limit);
}
// GET /api/data-sources/:id/preview
export const getDataSourcePreview = async (req, res) => {
    try {
        const { id } = req.params;
        const dataSource = await db('data_sources').where({ id }).first();
        if (!dataSource) {
            return res.status(404).json({ error: 'Fuente de datos no encontrada.' });
        }
        let data = [];
        let columns = [];
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
                const externalDb = db.constructor({
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
                }
                catch (extDbError) {
                    console.error('Error fetching data from external DB:', extDbError);
                    return res.status(500).json({ error: `Error al obtener datos de la base de datos externa: ${extDbError.message}` });
                }
                finally {
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
                    data = sheetData.slice(1).map((row) => {
                        const obj = {};
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
    }
    catch (error) {
        res.status(500).json({ error: `Error al obtener la previsualización de la fuente de datos: ${error.message}` });
    }
};
// POST /api/data-sources/:id/transform
export const transformDataSource = async (req, res) => {
    try {
        const { id } = req.params;
        const { transformations } = req.body; // e.g., { firstRowAsHeaders: true, selectedColumns: ['col1', 'col2'] }
        const dataSource = await db('data_sources').where({ id }).first();
        if (!dataSource) {
            return res.status(404).json({ error: 'Fuente de datos no encontrada.' });
        }
        let rawData = [];
        let originalColumns = [];
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
                const externalDb = db.constructor({
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
                }
                finally {
                    await externalDb.destroy();
                }
                break;
            case 'google_sheet':
                const googleSheetDetails = JSON.parse(dataSource.connection_details);
                const googleApiKey = process.env.GOOGLE_API_KEY || '';
                const sheetData = await getSpreadsheetData(googleSheetDetails.spreadsheetId || dataSource.name, googleSheetDetails.range || 'A:Z', googleApiKey);
                if (sheetData && sheetData.length > 0) {
                    originalColumns = sheetData[0];
                    rawData = sheetData.slice(1).map((row) => {
                        const obj = {};
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
                const newRow = {};
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
                const newRow = {};
                transformations.selectedColumns.forEach((col) => {
                    if (row.hasOwnProperty(col)) {
                        newRow[col] = row[col];
                    }
                });
                return newRow;
            });
            transformedColumns = transformations.selectedColumns;
        }
        res.status(200).json({ columns: transformedColumns, data: transformedData });
    }
    catch (error) {
        res.status(500).json({ error: `Error al transformar la fuente de datos: ${error.message}` });
    }
};
