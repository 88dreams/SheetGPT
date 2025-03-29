export interface StructuredData {
  id: string;
  conversation_id: string;
  data_type: string;
  schema_version: string;
  data: Record<string, unknown>;
  meta_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  columns: Column[];
}

export interface Column {
  id: string;
  structured_data_id: string;
  name: string;
  data_type: ColumnDataType;
  format?: string;
  formula?: string;
  order: number;
  is_active: boolean;
  meta_data: Record<string, unknown>;
}

export type ColumnDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'currency' | 'object' | 'array';

export interface DataChange {
  id: string;
  structured_data_id: string;
  user_id: string;
  change_type: ChangeType;
  column_name?: string;
  row_index?: number;
  old_value?: string;
  new_value?: string;
  created_at: string;
  meta_data: Record<string, unknown>;
}

export type ChangeType = 'insert_row' | 'delete_row' | 'update_cell' | 'add_column' | 'delete_column' | 'update_column';

export interface CellUpdate {
  column_name: string;
  row_index: number;
  value: string | number | boolean | null;
}

export interface ColumnDefinition {
  name: string;
  displayName: string;
  dataType: ColumnDataType;
  format?: string;
  width?: number;
  visible?: boolean;
  formula?: string;
  order: number;
}

export interface DataSourceConfig {
  type: 'spreadsheet' | 'database' | 'api' | 'manual';
  location?: string;
  credentials?: Record<string, string>;
  refreshInterval?: number;
  connectionString?: string;
}

export interface DataTransformConfig {
  transforms: DataTransform[];
}

export interface DataTransform {
  type: 'filter' | 'map' | 'sort' | 'group' | 'join';
  config: Record<string, unknown>;
}

export interface DataExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'google_sheets';
  includeHeaders: boolean;
  delimiter?: string;
  columns?: string[];
  fileName?: string;
  folderName?: string;
  driveFolderId?: string;
}

export interface ValidationError {
  rowIndex?: number;
  columnName?: string;
  message: string;
  errorType: 'type' | 'format' | 'required' | 'unique' | 'reference' | 'custom';
  severity: 'error' | 'warning' | 'info';
}