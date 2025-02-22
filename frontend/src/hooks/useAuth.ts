import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import React from 'react'

interface User {
  email: string
  is_active: boolean
  is_superuser: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isReady: boolean
}

export function useAuth() {
  const navigate = useNavigate()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isReady: false
  })
  
  // Add ref to track if auth check is in progress
  const authCheckInProgress = React.useRef(false)
  // Add ref to track if initial auth check has been done
  const initialAuthCheckDone = React.useRef(false)
  // Add ref to track component mount status
  const isMounted = React.useRef(true)
  // Add ref to track last successful check time
  const lastAuthCheck = React.useRef<number>(0)
  // Minimum time between auth checks (5 seconds)
  const AUTH_CHECK_THROTTLE = 5000

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const checkAuthStatus = async (force: boolean = false) => {
    // Prevent multiple simultaneous checks
    if (authCheckInProgress.current) {
      console.log('Auth check already in progress, skipping')
      return
    }

    // Check if we've done a check recently
    const now = Date.now()
    if (!force && now - lastAuthCheck.current < AUTH_CHECK_THROTTLE) {
      console.log('Auth check throttled, using cached state')
      return
    }

    const token = localStorage.getItem('auth_token')
    
    // If there's no token and we've already done the initial check, skip
    if (!token && initialAuthCheckDone.current) {
      return
    }
    
    // If there's no token, set unauthenticated without API call
    if (!token) {
      console.log('No auth token found, setting unauthenticated state')
      if (isMounted.current) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isReady: true
        })
      }
      initialAuthCheckDone.current = true
      return
    }
    
    console.log('Starting auth check:', {
      hasToken: true,
      currentAuthState: authState,
      timestamp: new Date().toISOString()
    })
    
    authCheckInProgress.current = true
    
    try {
      const user = await api.auth.me()
      console.log('Auth check successful:', {
        user,
        timestamp: new Date().toISOString()
      })
      
      if (isMounted.current) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          isReady: true
        })
        lastAuthCheck.current = now
      }
    } catch (error) {
      console.error('Auth check failed:', {
        error,
        timestamp: new Date().toISOString()
      })
      
      if (isMounted.current) {
        // Only clear token if it's an auth error
        if (error instanceof Error && error.message.includes('401')) {
          console.log('Clearing invalid token')
          localStorage.removeItem('auth_token')
        }
        
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isReady: true
        })
      }
    } finally {
      authCheckInProgress.current = false
      initialAuthCheckDone.current = true
    }
  }

  useEffect(() => {
    // Only run the initial auth check once
    if (!initialAuthCheckDone.current) {
      checkAuthStatus(true)
    }
  }, [])

  const login = async (email: string, password: string) => {
    console.log('Login attempt started:', { email, timestamp: new Date().toISOString() })
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await api.auth.login({ email, password })
      console.log('Login successful, token received:', {
        tokenLength: response.access_token.length,
        expiresIn: response.expires_in,
        timestamp: new Date().toISOString()
      })
      
      // Set the token in localStorage
      localStorage.setItem('auth_token', response.access_token)
      
      // Update auth state directly here
      const user = await api.auth.me()
      if (isMounted.current) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          isReady: true
        })
        lastAuthCheck.current = Date.now()
      }
      
      return true
    } catch (error) {
      console.error('Login failed:', {
        error,
        timestamp: new Date().toISOString()
      })
      
      if (isMounted.current) {
        localStorage.removeItem('auth_token')
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: false,
          user: null
        }))
      }
      return false
    }
  }

  const logout = async () => {
    console.log('Logout initiated')
    try {
      await api.auth.logout()
      if (isMounted.current) {
        localStorage.removeItem('auth_token')
        lastAuthCheck.current = 0
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isReady: true
        })
      }
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const register = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    try {
      const user = await api.auth.register({ email, password })
      // After registration, log in automatically
      return login(email, password)
    } catch (error) {
      console.error('Registration error:', error)
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        isAuthenticated: false,
        user: null
      }))
      return false
    }
  }

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isReady: authState.isReady,
    login,
    logout,
    register
  }
} 