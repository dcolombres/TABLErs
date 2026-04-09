import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data.sqlite');
console.log('Testing connection to:', dbPath);
const db = knex({
    client: 'sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
});
try {
    const result = await db.raw('SELECT 1');
    console.log('Connection successful:', result);
    process.exit(0);
}
catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
}
