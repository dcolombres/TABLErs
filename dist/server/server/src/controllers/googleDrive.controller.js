"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGoogleSheet = void 0;
const googleSheets_service_1 = require("../services/googleSheets.service");
const db_service_1 = __importDefault(require("../services/db.service"));
const uuid_1 = require("uuid");
const syncGoogleSheet = async (req, res) => {
    const { gdriveUrl, googleApiKey } = req.body;
    if (!gdriveUrl || !googleApiKey) {
        return res.status(400).json({ error: 'Se requiere la URL de Google Sheets y la API Key.' });
    }
    try {
        const spreadsheetId = (0, googleSheets_service_1.extractSpreadsheetId)(gdriveUrl);
        if (!spreadsheetId) {
            return res.status(400).json({ error: 'URL de Google Sheets inválida. Asegúrate de que sea un enlace de compartir válido.' });
        }
        // For now, we'll assume the first sheet and all data
        const sheetData = await (0, googleSheets_service_1.getSpreadsheetData)(spreadsheetId, 'A:ZZ', googleApiKey);
        if (sheetData.length === 0) {
            return res.status(400).json({ error: 'No se encontraron datos en la hoja de cálculo.' });
        }
        const headers = sheetData[0];
        const rows = sheetData.slice(1);
        const tableName = `google_sheet_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        await db_service_1.default.schema.createTable(tableName, (table) => {
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
        await (0, db_service_1.default)(tableName).insert(formattedRows);
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
exports.syncGoogleSheet = syncGoogleSheet;
