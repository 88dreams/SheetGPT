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

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  requiresAuth?: boolean
  headers?: Record<string, string>
}

// API URL configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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
    hasToken: !!requestHeaders['Authorization']
  })

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders
    })

    console.log(`Response from ${endpoint}:`, {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    })

    if (!response.ok) {
      let errorDetail
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || `Request failed with status ${response.status}`
      } catch {
        errorDetail = `HTTP error! status: ${response.status}`
      }
      console.error(`API Error for ${endpoint}:`, errorDetail)
      throw new Error(errorDetail)
    }

    const data = await response.json()
    console.log(`Successful response from ${endpoint}:`, {
      dataType: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : undefined
    })
    return data
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error)
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

    sendMessage: (conversationId: string, content: string): Promise<Message> =>
      request(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        requiresAuth: true
      })
  }
} 