// Common API response types

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_admin: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// API Error Response Types
export interface ApiErrorResponse {
  error: string;
  message: string;
  details: ApiErrorDetails;
  status_code: number;
}

export interface ApiErrorDetails {
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  field_errors?: Record<string, string>;
  operation?: string;
  original_error?: string;
  source_type?: string;
  target_type?: string;
  source_id?: string;
  target_id?: string;
  required_role?: string;
  service?: string;
  [key: string]: unknown;
}

// Chat related types
export interface Conversation {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  order?: number;
  messages: Message[];
  meta_data: Record<string, unknown>;
  tags?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  conversation_id: string;
  meta_data: Record<string, unknown>;
}

// Data related types
export interface RowData {
  [key: string]: unknown;
}

export interface RowsResponse {
  total: number;
  rows: RowData[];
  column_order: string[];
}

// Type guards for API responses
export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  if (!data || typeof data !== 'object') return false;
  
  const errorResponse = data as Partial<ApiErrorResponse>;
  return (
    typeof errorResponse.error === 'string' &&
    typeof errorResponse.message === 'string' &&
    typeof errorResponse.status_code === 'number' &&
    errorResponse.details !== undefined
  );
}

// Common API request types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface SearchParams {
  search?: string;
  filter?: Record<string, string>;
}