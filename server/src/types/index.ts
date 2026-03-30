export type DBType = 'sqlite' | 'postgres' | 'mysql';

export interface DBConfig {
  type: DBType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string; // For SQLite
}

export interface QueryParams {
  table: string;
  columns: string[];
  aggregations?: {
    column: string;
    func: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
    alias: string;
  }[];
  filters?: {
    column: string;
    operator: string;
    value: any;
  }[];
  groupBy?: string[];
}

export interface DashboardConfig {
  id?: string;
  title: string;
  charts: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'table';
  dataSource: {
    table: string;
    xAxis: string;
    yAxis: string;
    aggregation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
  };
  filters: any[];
  colors?: string[];
}
