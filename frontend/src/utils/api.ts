/// <reference types="vite/client" />

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { FilterConfig } from '../components/sports/EntityFilter';

// Determine if we're running in Docker by checking the hostname
const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// For browser access, always use localhost or the environment variable
// This ensures the browser can resolve the hostname
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1'

console.log('API configuration:', {
  isDocker,
  API_URL,
  hostname: window.location.hostname,
  envApiUrl: import.meta.env.VITE_API_URL
});

// Create an Axios instance with default configuration
const apiClient = axios.create({
    baseURL: `${API_URL}${API_PREFIX}`,
    withCredentials: true,
    timeout: 15000,
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
  is_admin: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
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
    'Accept': 'application/json',
    ...(options.headers || {})
  }

  if (options.requiresAuth || endpoint === '/auth/me') {
    const token = getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const response = await apiClient.request({
      url: endpoint,
      method: options.method || 'GET',
      headers: requestHeaders,
      data: options.body ? JSON.parse(options.body as string) : undefined,
      withCredentials: true
    })

    return response.status === 204 ? undefined as T : response.data as T
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorDetail = error.response?.data?.detail || error.message
      throw new APIError(errorDetail, error.response?.status || 500)
    }
    throw error
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
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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
    getConversations: async (skip = 0, limit = 10): Promise<PaginatedResponse<Conversation>> => {
      const response = await request<PaginatedResponse<Conversation>>(`/chat/conversations?skip=${skip}&limit=${limit}`, { requiresAuth: true })
      return response
    },

    createConversation: (data: { title: string; description?: string }): Promise<Conversation> =>
      request('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),

    getConversation: (id: string): Promise<Conversation> =>
      request(`/chat/conversations/${id}`, { requiresAuth: true }),

    deleteConversation: (id: string): Promise<void> =>
      request(`/chat/conversations/${id}`, {
        method: 'DELETE',
        requiresAuth: true,
        headers: {
          'Accept': '*/*'  // Accept any response type since we expect 204
        }
      }),

    updateConversation: (id: string, data: { title: string; description?: string }): Promise<Conversation> =>
      request(`/chat/conversations/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),

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

    getRows: (dataId: string, skip: number = 0, limit: number = 50): Promise<RowsResponse> =>
      request(`/data/${dataId}/rows?skip=${skip}&limit=${limit}`, { requiresAuth: true }),

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
    getTemplates: (): Promise<string[]> => {
      console.log('API: Fetching export templates');
      return request('/export/templates', { requiresAuth: true });
    },

    // Preview endpoint
    getExportPreview: (dataId: string, templateName: string): Promise<{
      columns: string[];
      sampleData: any[][];
    }> => {
      console.log('API: Fetching export preview for dataId:', dataId, 'template:', templateName);
      return request(`/export/preview/${dataId}?template=${templateName}`, { requiresAuth: true });
    },

    // Export endpoints
    exportToSheets: (dataId: string, templateName: string, title?: string): Promise<any> => {
      console.log('API: Exporting to sheets with dataId:', dataId, 'template:', templateName, 'title:', title);
      return request('/export/sheets', {
        method: 'POST',
        body: JSON.stringify({
          data_id: dataId,
          template_name: templateName,
          title: title || `Exported Data - ${new Date().toLocaleDateString()}`
        }),
        requiresAuth: true
      });
    },

    applyTemplate: (spreadsheetId: string, templateName: string): Promise<any> => {
      console.log('API: Applying template to spreadsheet:', spreadsheetId, 'template:', templateName);
      return request(`/export/sheets/${spreadsheetId}/template`, {
        method: 'POST',
        body: JSON.stringify({
          template_name: templateName
        }),
        requiresAuth: true
      });
    }
  },
  
  // Add sports API endpoints
  sports: {
    // Generic entity endpoints
    getEntities: async (
      entityType: string,
      filters: FilterConfig[] = [],
      page: number = 1,
      limit: number = 50,
      sortBy: string = 'id',
      sortDirection: 'asc' | 'desc' = 'asc'
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_direction: sortDirection
      });

      // Add filters to the request
      if (filters && filters.length > 0) {
        try {
          // Log the filters we're sending
          console.log(`API: Original filters for ${entityType}:`, filters);
          console.log(`API: First filter value type:`, typeof filters[0].value);
          
          // Ensure filters have the correct structure expected by the backend
          const formattedFilters = filters.map(filter => ({
            field: filter.field,
            operator: filter.operator,
            value: filter.value
          }));
          
          console.log(`API: Formatted filters:`, formattedFilters);
          console.log(`API: First formatted filter value type:`, typeof formattedFilters[0].value);
          
          // Convert filters to a format the API can understand
          const filtersParam = JSON.stringify(formattedFilters);
          params.append('filters', filtersParam);
          console.log(`API: Adding filters to ${entityType} request:`, filtersParam);
          console.log(`API: URL-encoded filters:`, encodeURIComponent(filtersParam));
        } catch (error) {
          console.error('Error stringifying filters:', error);
        }
      }

      const url = `/sports/entities/${entityType}?${params.toString()}`;
      console.log(`API: Making request to ${url}`);
      
      try {
        const result = await request(url, { requiresAuth: true });
        console.log(`API: Received response for ${entityType}:`, {
          resultType: typeof result,
          isArray: Array.isArray(result),
          length: Array.isArray(result) ? result.length : 'not an array',
          sample: Array.isArray(result) && result.length > 0 ? result[0] : result
        });
        return result;
      } catch (error) {
        console.error(`API: Error fetching ${entityType} entities:`, error);
        throw error;
      }
    },
      
    // League endpoints
    getLeagues: (): Promise<any[]> =>
      request('/sports/leagues', { requiresAuth: true }),
      
    createLeague: (data: any): Promise<any> =>
      request('/sports/leagues', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getLeague: (id: string): Promise<any> =>
      request(`/sports/leagues/${id}`, { requiresAuth: true }),
      
    updateLeague: (id: string, data: any): Promise<any> =>
      request(`/sports/leagues/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteLeague: (id: string): Promise<void> =>
      request(`/sports/leagues/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // Team endpoints
    getTeams: (leagueId?: string): Promise<any[]> =>
      request('/sports/teams', { 
        requiresAuth: true,
        ...(leagueId && { params: { league_id: leagueId } })
      }),
      
    createTeam: (data: any): Promise<any> =>
      request('/sports/teams', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getTeam: (id: string): Promise<any> =>
      request(`/sports/teams/${id}`, { requiresAuth: true }),
      
    updateTeam: (id: string, data: any): Promise<any> =>
      request(`/sports/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteTeam: (id: string): Promise<void> =>
      request(`/sports/teams/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // Player endpoints
    getPlayers: (teamId?: string): Promise<any[]> =>
      request('/sports/players', { 
        requiresAuth: true,
        ...(teamId && { params: { team_id: teamId } })
      }),
      
    createPlayer: (data: any): Promise<any> =>
      request('/sports/players', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getPlayer: (id: string): Promise<any> =>
      request(`/sports/players/${id}`, { requiresAuth: true }),
      
    updatePlayer: (id: string, data: any): Promise<any> =>
      request(`/sports/players/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deletePlayer: (id: string): Promise<void> =>
      request(`/sports/players/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // Game endpoints
    getGames: (filters?: { league_id?: string, team_id?: string, season_year?: number }): Promise<any[]> =>
      request('/sports/games', { 
        requiresAuth: true,
        ...(filters && { params: filters })
      }),
      
    createGame: (data: any): Promise<any> =>
      request('/sports/games', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getGame: (id: string): Promise<any> =>
      request(`/sports/games/${id}`, { requiresAuth: true }),
      
    updateGame: (id: string, data: any): Promise<any> =>
      request(`/sports/games/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteGame: (id: string): Promise<void> =>
      request(`/sports/games/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // Stadium endpoints
    getStadiums: (): Promise<any[]> =>
      request('/sports/stadiums', { requiresAuth: true }),
      
    createStadium: (data: any): Promise<any> =>
      request('/sports/stadiums', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getStadium: (id: string): Promise<any> =>
      request(`/sports/stadiums/${id}`, { requiresAuth: true }),
      
    updateStadium: (id: string, data: any): Promise<any> =>
      request(`/sports/stadiums/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteStadium: (id: string): Promise<void> =>
      request(`/sports/stadiums/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // BroadcastCompany endpoints
    getBroadcastCompanies: (): Promise<any[]> =>
      request('/sports/broadcast-companies', { requiresAuth: true }),
      
    createBroadcastCompany: (data: any): Promise<any> =>
      request('/sports/broadcast-companies', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getBroadcastCompany: (id: string): Promise<any> =>
      request(`/sports/broadcast-companies/${id}`, { requiresAuth: true }),
      
    updateBroadcastCompany: (id: string, data: any): Promise<any> =>
      request(`/sports/broadcast-companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteBroadcastCompany: (id: string): Promise<void> =>
      request(`/sports/broadcast-companies/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // BroadcastRights endpoints
    getBroadcastRights: (filters?: { entity_type?: string, entity_id?: string, company_id?: string }): Promise<any[]> =>
      request('/sports/broadcast-rights', { 
        requiresAuth: true,
        ...(filters && { params: filters })
      }),
      
    createBroadcastRights: (data: any): Promise<any> =>
      request('/sports/broadcast-rights', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getBroadcastRight: (id: string): Promise<any> =>
      request(`/sports/broadcast-rights/${id}`, { requiresAuth: true }),
      
    updateBroadcastRights: (id: string, data: any): Promise<any> =>
      request(`/sports/broadcast-rights/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteBroadcastRights: (id: string): Promise<void> =>
      request(`/sports/broadcast-rights/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // ProductionCompany endpoints
    getProductionCompanies: (): Promise<any[]> =>
      request('/sports/production-companies', { requiresAuth: true }),
      
    createProductionCompany: (data: any): Promise<any> =>
      request('/sports/production-companies', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getProductionCompany: (id: string): Promise<any> =>
      request(`/sports/production-companies/${id}`, { requiresAuth: true }),
      
    updateProductionCompany: (id: string, data: any): Promise<any> =>
      request(`/sports/production-companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteProductionCompany: (id: string): Promise<void> =>
      request(`/sports/production-companies/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // ProductionService endpoints
    getProductionServices: (filters?: { entity_type?: string, entity_id?: string, company_id?: string }): Promise<any[]> =>
      request('/sports/production-services', { 
        requiresAuth: true,
        ...(filters && { params: filters })
      }),
      
    createProductionService: (data: any): Promise<any> =>
      request('/sports/production-services', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getProductionService: (id: string): Promise<any> =>
      request(`/sports/production-services/${id}`, { requiresAuth: true }),
      
    updateProductionService: (id: string, data: any): Promise<any> =>
      request(`/sports/production-services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteProductionService: (id: string): Promise<void> =>
      request(`/sports/production-services/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // Brand endpoints
    getBrands: (industry?: string): Promise<any[]> =>
      request('/sports/brands', { 
        requiresAuth: true,
        ...(industry && { params: { industry } })
      }),
      
    createBrand: (data: any): Promise<any> =>
      request('/sports/brands', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getBrand: (id: string): Promise<any> =>
      request(`/sports/brands/${id}`, { requiresAuth: true }),
      
    updateBrand: (id: string, data: any): Promise<any> =>
      request(`/sports/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteBrand: (id: string): Promise<void> =>
      request(`/sports/brands/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // BrandRelationship endpoints
    getBrandRelationships: (filters?: { brand_id?: string, entity_type?: string, entity_id?: string, relationship_type?: string }): Promise<any[]> =>
      request('/sports/brand-relationships', { 
        requiresAuth: true,
        ...(filters && { params: filters })
      }),
      
    createBrandRelationship: (data: any): Promise<any> =>
      request('/sports/brand-relationships', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getBrandRelationship: (id: string): Promise<any> =>
      request(`/sports/brand-relationships/${id}`, { requiresAuth: true }),
      
    updateBrandRelationship: (id: string, data: any): Promise<any> =>
      request(`/sports/brand-relationships/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteBrandRelationship: (id: string): Promise<void> =>
      request(`/sports/brand-relationships/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // Export endpoint
    exportEntities: (data: { entity_type: string, entity_ids: string[], include_relationships: boolean }): Promise<any> =>
      request('/sports/export', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),

    // GameBroadcast endpoints
    getGameBroadcasts: (game_id?: string): Promise<any[]> =>
      request('/sports/game-broadcasts', { 
        requiresAuth: true,
        ...(game_id && { params: { game_id } })
      }),
      
    createGameBroadcast: (data: any): Promise<any> =>
      request('/sports/game-broadcasts', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getGameBroadcast: (id: string): Promise<any> =>
      request(`/sports/game-broadcasts/${id}`, { requiresAuth: true }),
      
    updateGameBroadcast: (id: string, data: any): Promise<any> =>
      request(`/sports/game-broadcasts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteGameBroadcast: (id: string): Promise<void> =>
      request(`/sports/game-broadcasts/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
      
    // LeagueExecutive endpoints
    getLeagueExecutives: (league_id?: string): Promise<any[]> =>
      request('/sports/league-executives', { 
        requiresAuth: true,
        ...(league_id && { params: { league_id } })
      }),
      
    createLeagueExecutive: (data: any): Promise<any> =>
      request('/sports/league-executives', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    getLeagueExecutive: (id: string): Promise<any> =>
      request(`/sports/league-executives/${id}`, { requiresAuth: true }),
      
    updateLeagueExecutive: (id: string, data: any): Promise<any> =>
      request(`/sports/league-executives/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requiresAuth: true
      }),
      
    deleteLeagueExecutive: (id: string): Promise<void> =>
      request(`/sports/league-executives/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      }),
  },

  admin: {
    cleanDatabase: (): Promise<{ message: string; details: string }> =>
      request('/admin/clean-database', {
        method: 'POST',
        requiresAuth: true
      }),
  },
} 