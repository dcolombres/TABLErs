import knex from 'knex';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../data.sqlite');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
});

export default db;