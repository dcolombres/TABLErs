export type DBType = 'sqlite' | 'postgres' | 'mysql';

export interface DBConfig {
  type: DBType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
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
  filters: { column: string; operator: string; value: any }[];
  colors?: string[];
}

export interface DashboardConfig {
  id?: string;
  title: string;
  charts: ChartConfig[];
}
