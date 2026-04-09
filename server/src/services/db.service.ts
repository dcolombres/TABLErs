import knex, { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine DB client from environment (default sqlite)
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite3';
const DB_CONNECTION = process.env.DB_CONNECTION || '';

let db: Knex;

if (DB_CLIENT === 'sqlite3') {
  const dbPath = path.isAbsolute(DB_CONNECTION) 
    ? DB_CONNECTION 
    : path.resolve(process.cwd(), 'data.sqlite');
  
  db = knex({
    client: 'sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
  });
} else {
  db = knex({
    client: DB_CLIENT,
    connection: DB_CONNECTION,
  });
}

const maxRetries = 3;
let attempt = 0;

export const dbReady = (async () => {
  while (attempt < maxRetries) {
    try {
      await db.raw('SELECT 1');
      Logger.info('Database connection established');
      
      // Ensure dashboards table exists
      if (!await db.schema.hasTable('dashboards')) {
        Logger.info('Creating dashboards table...');
        await db.schema.createTable('dashboards', (table) => {
          table.increments('id').primary();
          table.string('name').notNullable();
          table.text('description');
          table.text('charts').defaultTo('[]');
          table.timestamps(true, true);
        });
      } else {
        // Add missing columns if table exists but is outdated
        if (!await db.schema.hasColumn('dashboards', 'charts')) {
          Logger.info('Updating dashboards table: adding charts column.');
          await db.schema.alterTable('dashboards', (table) => {
            table.text('charts').defaultTo('[]');
          });
        }
      }

      // Ensure data_sources table exists
      if (!await db.schema.hasTable('data_sources')) {
        Logger.info('Creating data_sources table...');
        await db.schema.createTable('data_sources', (table) => {
          table.increments('id').primary();
          table.string('name').notNullable();
          table.string('type').notNullable(); // 'mysql', 'csv', 'sql_dump', etc.
          table.string('table_name').notNullable();
          table.text('connection_details'); // Stored as JSON string
          table.integer('dashboard_id').unsigned().references('id').inTable('dashboards');
          table.timestamps(true, true);
        });
      } else {
        // Migration check for missing columns in data_sources
        if (!await db.schema.hasColumn('data_sources', 'dashboard_id')) {
          Logger.info('Updating data_sources table: adding dashboard_id column.');
          await db.schema.alterTable('data_sources', (table) => {
            table.integer('dashboard_id').unsigned().references('id').inTable('dashboards');
          });
        }
      }

      const dashboards = await db('dashboards').select('id').where({ id: 1 }).first();
      if (!dashboards) {
        Logger.info('Creating default dashboard (ID: 1).');
        await db('dashboards').insert({
          id: 1,
          name: 'Mi Primer Tablero',
          description: 'Tablero creado automáticamente para el sistema.',
          charts: '[]'
        });
      }
      
      return db;
    } catch (error) {
      attempt++;
      Logger.error(`DB connection/init attempt ${attempt} failed:`, error);
      if (attempt >= maxRetries) {
        Logger.error('Max DB connection attempts reached. Exiting.');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  return db;
})();

export function getDb(): Knex {
  return db;
}

export default db;