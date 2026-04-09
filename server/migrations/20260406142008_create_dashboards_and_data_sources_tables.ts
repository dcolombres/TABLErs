import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dashboards', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('data_sources', (table) => {
    table.increments('id').primary();
    table.integer('dashboard_id').unsigned().references('dashboards.id').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('type').notNullable(); // e.g., 'csv', 'excel', 'sql_upload', 'db_connection', 'google_sheet'
    table.string('table_name'); // For uploaded files, the actual table name in SQLite
    table.text('connection_details'); // JSON string for DB connection details or Google Sheet info
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('data_sources');
  await knex.schema.dropTableIfExists('dashboards');
}

