import { google } from 'googleapis';

export async function getSpreadsheetData(spreadsheetId: string, range: string, apiKey: string): Promise<string[][]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      key: apiKey,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching data from Google Sheets API:', error);
    throw new Error('Could not fetch data from Google Sheets. Make sure the spreadsheet ID and API Key are correct, and the sheet is publicly accessible or your API Key has the necessary permissions.');
  }
}

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
