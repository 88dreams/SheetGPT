interface User {
  id: string
  email: string
}

interface LoginResponse {
  user: User
  access_token: string
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const api = {
  auth: {
    register: (data: { email: string; password: string }): Promise<User> =>
      request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    login: (data: { email: string; password: string }): Promise<LoginResponse> =>
      request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    logout: (): Promise<void> =>
      request('/api/v1/auth/logout', {
        method: 'POST'
      }),

    me: (): Promise<User> =>
      request('/api/v1/auth/me')
  }
} 