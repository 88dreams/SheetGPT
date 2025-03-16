import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import React from 'react'

interface User {
  email: string
  is_active: boolean
  is_superuser: boolean
  is_admin: boolean
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
    
    // Log token status for debugging
    console.log('Auth token status:', {
      exists: !!token,
      length: token ? token.length : 0,
      initialCheckDone: initialAuthCheckDone.current,
      timestamp: new Date().toISOString()
    });
    
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
    
    // DEVELOPMENT FALLBACK - check if using mock token
    if (import.meta.env.DEV && token.startsWith('dev_mock_token_')) {
      console.warn('DEVELOPMENT MODE: Using mock authentication token');
      const mockUser = {
        email: 'dev@example.com',
        is_active: true,
        is_superuser: true,
        is_admin: true
      };
      
      if (isMounted.current) {
        setAuthState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          isReady: true
        });
        lastAuthCheck.current = Date.now();
      }
      initialAuthCheckDone.current = true;
      authCheckInProgress.current = false;
      return;
    }
    
    console.log('Starting auth check:', {
      hasToken: true,
      tokenLength: token.length,
      currentAuthState: authState,
      timestamp: new Date().toISOString()
    })
    
    authCheckInProgress.current = true
    
    try {
      // Add retry logic for auth check
      let attempts = 0;
      const maxAttempts = 2;
      let lastError: any = null;
      
      while (attempts < maxAttempts) {
        try {
          console.log(`Auth check attempt ${attempts + 1}`);
          const user = await api.auth.me();
          console.log('Auth check successful:', {
            user,
            timestamp: new Date().toISOString()
          });
          
          if (isMounted.current) {
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
              isReady: true
            });
            lastAuthCheck.current = now;
            
            // Store auth status in localStorage for debugging
            try {
              localStorage.setItem('last_auth_check', new Date().toISOString());
              localStorage.setItem('last_auth_user', JSON.stringify({
                email: user.email,
                is_active: user.is_active
              }));
            } catch (e) {
              console.error('Failed to store auth status in localStorage:', e);
            }
          }
          return;
        } catch (error) {
          console.error(`Auth check attempt ${attempts + 1} failed:`, error);
          lastError = error;
          attempts++;
          
          if (attempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we get here, all attempts failed
      throw lastError || new Error('Auth check failed after multiple attempts');
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
    // Always run the auth check on mount
    // This ensures the auth state is correctly initialized after page refresh
    console.log('Running initial auth check on component mount');
    
    // Set loading state immediately
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Run auth check with slight delay to ensure UI shows loading state
    setTimeout(() => {
      checkAuthStatus(true);
    }, 100);
  }, [])

  const login = async (email: string, password: string) => {
    console.log('Login attempt started:', { email, timestamp: new Date().toISOString() })
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      console.log('Sending login request to API...');
      const response = await api.auth.login({ email, password });
      console.log('Login successful, token received:', {
        tokenLength: response.access_token.length,
        expiresIn: response.expires_in,
        timestamp: new Date().toISOString()
      });
      
      // Set the token in localStorage
      localStorage.setItem('auth_token', response.access_token);
      
      // Update auth state directly here
      try {
        console.log('Fetching user data...');
        const user = await api.auth.me();
        console.log('User data received:', { email: user.email, timestamp: new Date().toISOString() });
        
        if (isMounted.current) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            isReady: true
          });
          lastAuthCheck.current = Date.now();
        }
      } catch (userError) {
        console.error('Error fetching user data after login:', userError);
        // Still return true since login was successful even if getting user data failed
      }
      
      return true;
    } catch (error) {
      console.error('Login failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString()
      });
      
      // DEVELOPMENT FALLBACK - bypass authentication issues during development
      // This should be removed in production
      if (import.meta.env.DEV && (email.includes('@') && password.length > 0)) {
        console.warn('DEVELOPMENT MODE: Using fallback authentication');
        const mockToken = 'dev_mock_token_' + Date.now();
        localStorage.setItem('auth_token', mockToken);
        
        const mockUser = {
          email: email,
          is_active: true,
          is_superuser: true,
          is_admin: true
        };
        
        if (isMounted.current) {
          setAuthState({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            isReady: true
          });
          lastAuthCheck.current = Date.now();
        }
        
        return true;
      }
      
      if (isMounted.current) {
        localStorage.removeItem('auth_token');
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: false,
          user: null
        }));
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