import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export function useAuth() {
  const navigate = useNavigate()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  })

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const user = await response.json()
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false
        })
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      })
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })

      if (response.ok) {
        const user = await response.json()
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false
        })
        navigate('/chat')
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      })
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include'
      })

      if (response.ok) {
        const user = await response.json()
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false
        })
        navigate('/chat')
        return true
      }
      return false
    } catch (error) {
      console.error('Registration error:', error)
      return false
    }
  }

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    register
  }
} 