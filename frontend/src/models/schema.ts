export interface SchemaColumn {
  name: string;
  dataType?: string;
  description?: string;
  isFilterable?: boolean;
  isRelationalId?: boolean;
  relatedTable?: string;
}

export interface SchemaTable {
  name: string;
  description?: string;
  columns: SchemaColumn[];
}

export interface SchemaSummaryResponse {
  tables: SchemaTable[];
} 