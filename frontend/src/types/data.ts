export interface StructuredData {
  id: string
  conversation_id: string
  data_type: string
  schema_version: string
  data: Record<string, any>
  meta_data: Record<string, any>
  created_at: string
  updated_at: string
  columns: Column[]
}

export interface Column {
  id: string
  structured_data_id: string
  name: string
  data_type: string
  format?: string
  formula?: string
  order: number
  is_active: boolean
  meta_data: Record<string, any>
}

export interface DataChange {
  id: string
  structured_data_id: string
  user_id: string
  change_type: string
  column_name?: string
  row_index?: number
  old_value?: string
  new_value?: string
  created_at: string
  meta_data: Record<string, any>
}

export interface CellUpdate {
  column_name: string
  row_index: number
  value: any
} 