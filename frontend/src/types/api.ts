// Common API response types

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface User {
  email: string
  is_active: boolean
  is_superuser: boolean
  is_admin: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// Chat related types
export interface Conversation {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  order?: number
  messages: Message[]
  meta_data: Record<string, any>
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  conversation_id: string
  meta_data: Record<string, any>
}

// Data related types
export interface RowData {
  [key: string]: any
}

export interface RowsResponse {
  total: number
  rows: RowData[]
  column_order: string[]
}