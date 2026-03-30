// shared/types/index.ts

export interface ChartConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie';
  tableName: string;
  columns: string[];
  where?: Record<string, any>;
  options?: Record<string, any>;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'sqlite' | 'csv' | 'excel' | 'external_db';
  tableName: string; // The actual table name in the DB
}
