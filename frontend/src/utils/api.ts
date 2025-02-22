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

export interface StructuredData {
  id: string
  conversation_id: string
  data_type: string
  schema_version: string
  data: Record<string, any>
  meta_data: Record<string, any>
  created_at: string
  updated_at: string
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
      headers: requestHeaders
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
      throw new Error(errorDetail)
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
    if (error instanceof Error) {
      throw new Error(`API request failed: ${error.message}`)
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              fullResponse += data.text
              if (onChunk) onChunk(data.text)
            }
          }
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
      request(`/data/by-message/${messageId}`, { requiresAuth: true })
  }
} 