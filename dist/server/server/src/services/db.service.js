import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../data.sqlite');
let db;
try {
    db = knex({
        client: 'sqlite3',
        connection: {
            filename: dbPath,
        },
        useNullAsDefault: true,
    });
}
catch (error) {
    console.error('Error initializing database connection:', error);
    process.exit(1); // Exit the process if DB connection fails
}
export default db;
