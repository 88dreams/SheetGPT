/// <reference types="vite/client" />

import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface User {
  email: string
  is_active: boolean
  is_superuser: boolean
}

export interface Conversation {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
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

// Add row management types
export interface RowData {
  [key: string]: any
}

export interface RowsResponse {
  total: number
  rows: RowData[]
  column_order: string[]
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  requiresAuth?: boolean
  headers?: Record<string, string>
}

// API URL configuration
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'
const API_PREFIX = '/api/v1'

// Token storage
const TOKEN_KEY = 'auth_token'

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Custom error class for API errors
export class APIError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  // Add authorization header if required
  if (options.requiresAuth || endpoint === `${API_PREFIX}/auth/me`) {
    const token = getToken()
    console.log(`Request to ${endpoint}, token exists:`, !!token)
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const { headers, ...restOptions } = options
  const url = `${API_URL}${API_PREFIX}${endpoint}`
  
  console.log(`Making request to: ${url}`, {
    method: options.method || 'GET',
    requiresAuth: options.requiresAuth,
    hasToken: !!requestHeaders['Authorization'],
    body: options.body ? JSON.parse(options.body as string) : undefined
  })

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include'
    })

    console.log(`Response from ${endpoint}:`, {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      let errorDetail
      try {
        const errorData = await response.json()
        console.error(`API Error Details:`, {
          endpoint,
          status: response.status,
          errorData,
          headers: Object.fromEntries(response.headers.entries())
        })
        errorDetail = errorData.detail || `Request failed with status ${response.status}`
      } catch (parseError) {
        console.error(`Failed to parse error response:`, {
          endpoint,
          status: response.status,
          parseError,
          responseText: await response.text()
        })
        errorDetail = `HTTP error! status: ${response.status}`
      }
      throw new APIError(errorDetail, response.status)
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T
    }

    const data = await response.json()
    console.log(`Successful response from ${endpoint}:`, {
      dataType: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : undefined,
      data: data
    })
    return data
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, {
      error,
      url,
      method: options.method || 'GET',
      headers: requestHeaders,
      body: options.body ? JSON.parse(options.body as string) : undefined
    })
    if (error instanceof APIError) {
      throw error
    }
    if (error instanceof Error) {
      throw new APIError(`API request failed: ${error.message}`, 500)
    }
    throw new APIError('Unknown error occurred', 500)
  }
}

export const api = {
  auth: {
    register: (data: { email: string; password: string }): Promise<User> =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    login: async (data: { email: string; password: string }): Promise<TokenResponse> => {
      const response = await request<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      setToken(response.access_token)
      return response
    },

    logout: (): Promise<void> => {
      removeToken()
      return Promise.resolve()
    },

    me: (): Promise<User> =>
      request('/auth/me', { requiresAuth: true })
  },

  chat: {
    getConversations: (): Promise<Conversation[]> =>
      request('/chat/conversations', { requiresAuth: true }),

    createConversation: (data: { title: string; description?: string }): Promise<Conversation> =>
      request('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),

    getConversation: (id: string): Promise<Conversation> =>
      request(`/chat/conversations/${id}`, { requiresAuth: true }),

    sendMessage: async (
      conversationId: string,
      content: string,
      structuredFormat?: Record<string, any>,
      onChunk?: (chunk: string) => void
    ): Promise<Message> => {
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(`${API_URL}${API_PREFIX}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content,
          role: 'user',
          structured_format: structuredFormat
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || `HTTP error! status: ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        buffer += chunk
        
        // Process complete lines from the buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (jsonStr) {
                const data = JSON.parse(jsonStr)
                if (data.text) {
                  fullResponse += data.text
                  if (onChunk) onChunk(data.text)
                }
              }
            } catch (error) {
              console.error('Error parsing streaming response:', error)
              // Continue processing other chunks even if one fails
            }
          }
        }
      }

      // Process any remaining data in the buffer
      if (buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(6).trim()
          if (jsonStr) {
            const data = JSON.parse(jsonStr)
            if (data.text) {
              fullResponse += data.text
              if (onChunk) onChunk(data.text)
            }
          }
        } catch (error) {
          console.error('Error parsing final chunk:', error)
        }
      }

      // Return a Message object with the complete response
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullResponse,
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
        meta_data: {}
      }
    }
  },

  data: {
    getStructuredData: (): Promise<StructuredData[]> =>
      request('/data', { requiresAuth: true }),

    getStructuredDataById: (id: string): Promise<StructuredData> =>
      request(`/data/${id}`, { requiresAuth: true }),

    getStructuredDataByMessageId: (messageId: string): Promise<StructuredData> =>
      request(`/data/by-message/${messageId}`, { requiresAuth: true }),
      
    createStructuredData: (data: Partial<StructuredData>): Promise<StructuredData> =>
      request('/data', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteStructuredData: (id: string): Promise<void> =>
      request(`/data/${id}`, { 
        method: 'DELETE',
        requiresAuth: true 
      }),
      
    updateStructuredData: (id: string, updates: Partial<StructuredData>): Promise<StructuredData> =>
      request(`/data/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        requiresAuth: true
      }),

    getColumns: (dataId: string): Promise<Column[]> =>
      request(`/data/${dataId}/columns`, { requiresAuth: true }),

    updateColumn: (dataId: string, columnName: string, updates: Partial<Column>): Promise<Column> =>
      request(`/data/${dataId}/columns/${columnName}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        requiresAuth: true
      }),

    updateCell: (dataId: string, update: { column_name: string; row_index: number; value: any }): Promise<any> =>
      request(`/data/${dataId}/cells`, {
        method: 'PUT',
        body: JSON.stringify(update),
        requiresAuth: true
      }),

    addRow: (dataId: string, rowData: Record<string, any>): Promise<any> =>
      request(`/data/${dataId}/rows`, {
        method: 'POST',
        body: JSON.stringify(rowData),
        requiresAuth: true
      }),

    deleteRow: (dataId: string, rowIndex: number): Promise<void> =>
      request(`/data/${dataId}/rows/${rowIndex}`, {
        method: 'DELETE',
        requiresAuth: true
      }),

    updateRow: (dataId: string, rowIndex: number, rowData: Record<string, any>): Promise<any> =>
      request(`/data/${dataId}/rows/${rowIndex}`, {
        method: 'PUT',
        body: JSON.stringify(rowData),
        requiresAuth: true
      })
  },

  export: {
    // Authentication endpoints
    getAuthUrl: (): Promise<{ url: string }> =>
      request('/export/auth/google', { requiresAuth: true }),

    getAuthStatus: (): Promise<{ authenticated: boolean }> =>
      request('/export/auth/status', { requiresAuth: true }),

    // Template endpoints
    getTemplates: (): Promise<string[]> =>
      request('/export/templates', { requiresAuth: true }),

    // Preview endpoint
    getExportPreview: (dataId: string, templateName: string): Promise<{
      columns: string[];
      sampleData: any[][];
    }> =>
      request(`/export/preview/${dataId}?template=${templateName}`, { requiresAuth: true }),

    // Export endpoints
    exportToSheets: (dataId: string, templateName: string): Promise<any> =>
      request('/export/sheets', {
        method: 'POST',
        body: JSON.stringify({
          data_id: dataId,
          template_name: templateName
        }),
        requiresAuth: true
      }),

    applyTemplate: (spreadsheetId: string, templateName: string): Promise<any> =>
      request(`/export/sheets/${spreadsheetId}/template`, {
        method: 'POST',
        body: JSON.stringify({
          template_name: templateName
        }),
        requiresAuth: true
      })
  }
} 