import { getSpreadsheetData, extractSpreadsheetId } from '../services/googleSheets.service.js';
import db from '../services/db.service.js';
import { v4 as uuidv4 } from 'uuid';
import { clearSchemaCache } from '../middleware/queryGuard.middleware.js';
export const syncGoogleSheet = async (req, res) => {
    const { gdriveUrl } = req.body;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!gdriveUrl) {
        return res.status(400).json({ error: 'Se requiere la URL de Google Sheets.' });
    }
    if (!googleApiKey) {
        return res.status(500).json({ error: 'GOOGLE_API_KEY no configurada en el servidor.' });
    }
    try {
        const spreadsheetId = extractSpreadsheetId(gdriveUrl);
        if (!spreadsheetId) {
            return res.status(400).json({ error: 'URL de Google Sheets inválida. Asegúrate de que sea un enlace de compartir válido.' });
        }
        // For now, we'll assume the first sheet and all data
        const sheetData = await getSpreadsheetData(spreadsheetId, 'A:ZZ', googleApiKey);
        if (sheetData.length === 0) {
            return res.status(400).json({ error: 'No se encontraron datos en la hoja de cálculo.' });
        }
        const headers = sheetData[0];
        const rows = sheetData.slice(1);
        const tableName = `google_sheet_${uuidv4().replace(/-/g, '')}`;
        await db.schema.createTable(tableName, (table) => {
            headers.forEach(header => {
                // Basic type inference for now, can be improved
                // All columns are TEXT by default, can be refined later
                table.text(header);
            });
        });
        const formattedRows = rows.map(row => {
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index];
            });
            return rowObject;
        });
        await db(tableName).insert(formattedRows);
        // Save metadata in data_sources
        // Assuming dashboard_id is 1 as placeholder.
        await db('data_sources').insert({
            dashboard_id: '1',
            name: `Google Sheet (${spreadsheetId.substring(0, 8)})`,
            type: 'google_sheet',
            table_name: tableName,
            connection_details: JSON.stringify({ gdriveUrl, spreadsheetId }),
        });
        clearSchemaCache();
        const schema = {};
        headers.forEach(header => {
            schema[header] = 'TEXT'; // Default to TEXT, can be improved with more robust type inference
        });
        res.json({ message: 'Datos de Google Sheet sincronizados y guardados.', tableName, schema });
    }
    catch (err) {
        console.error('Error syncing Google Sheet:', err);
        res.status(500).json({ error: err.message || 'Error al sincronizar Google Sheet.' });
    }
};
