"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpreadsheetData = getSpreadsheetData;
exports.extractSpreadsheetId = extractSpreadsheetId;
const googleapis_1 = require("googleapis");
async function getSpreadsheetData(spreadsheetId, range, apiKey) {
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth: apiKey });
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            key: apiKey,
        });
        return response.data.values || [];
    }
    catch (error) {
        console.error('Error fetching data from Google Sheets API:', error);
        throw new Error('Could not fetch data from Google Sheets. Make sure the spreadsheet ID and API Key are correct, and the sheet is publicly accessible or your API Key has the necessary permissions.');
    }
}
function extractSpreadsheetId(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}
