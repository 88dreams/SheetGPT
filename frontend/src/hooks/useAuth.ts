import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

interface User {
  id: string
  email: string
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
      const user = await api.auth.me()
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      })
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
      const response = await api.auth.login({ email, password })
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      })
      navigate('/chat')
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await api.auth.logout()
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

  const register = async (email: string, password: string) => {
    try {
      const user = await api.auth.register({ email, password })
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      })
      navigate('/chat')
      return true
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