/// <reference types="vite/client" />

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { isTokenExpiredOrExpiringSoon, refreshAuthToken } from './tokenRefresh';

// Determine if we're running in Docker by checking the hostname
const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// For browser access, we need to use localhost even when running in Docker
// This is because the browser can't resolve Docker container names
// Handle all environments safely
const getApiUrl = () => {
  // Default URL for all environments
  let apiUrl = 'http://localhost:8000';
  
  try {
    // Only attempt to access import.meta in a browser environment
    if (typeof window !== 'undefined') {
      try {
        // Using direct property access instead of optional chaining
        const envUrl = import.meta.env.VITE_API_URL;
        if (envUrl) {
          apiUrl = envUrl;
        }
      } catch (innerError) {
        // This is a safe fallback if import.meta is not available
        console.log('Import.meta not available, using default API URL');
      }
    }
  } catch (e) {
    // In test or non-browser environment
    console.log('Using default API URL for current environment');
  }
  
  return apiUrl;
};

const API_URL = getApiUrl();
const API_PREFIX = '/api/v1'

console.log('API configuration:', {
  isDocker,
  API_URL,
  hostname: window.location.hostname,
});

// Create an Axios instance with default configuration
export const apiClient = axios.create({
    baseURL: `${API_URL}${API_PREFIX}`,
    withCredentials: true,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Token storage
const TOKEN_KEY = 'auth_token'

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Flag to prevent multiple simultaneous token refresh attempts
let isRefreshing = false;
// Store pending requests that are waiting for token refresh
let pendingRequests: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Process pending requests after token refresh
const processPendingRequests = (error: any = null) => {
  if (error) {
    // If refresh failed, reject all pending requests
    pendingRequests.forEach(request => {
      request.reject(error);
    });
  } else {
    // If refresh succeeded, retry all pending requests
    pendingRequests.forEach(request => {
      request.resolve();
    });
  }
  pendingRequests = [];
};

// Add request interceptor to handle token refresh
apiClient.interceptors.request.use(
    async (config) => {
        // Check if token is expired or expiring soon and refresh if needed
        const token = getToken();
        if (token && config.url !== '/auth/refresh' && config.url !== '/auth/login') {
            if (isTokenExpiredOrExpiringSoon()) {
                console.log('Token expired or expiring soon, refreshing...');
                
                // Only refresh token once at a time
                if (!isRefreshing) {
                    isRefreshing = true;
                    
                    try {
                        const refreshed = await refreshAuthToken();
                        console.log('Token refresh result:', refreshed ? 'success' : 'failed');
                        isRefreshing = false;
                        
                        // Process pending requests
                        processPendingRequests();
                    } catch (error) {
                        console.error('Token refresh failed:', error);
                        isRefreshing = false;
                        
                        // Reject pending requests
                        processPendingRequests(error);
                        
                        // If refresh failed and this is not a public route, redirect to login
                        if (config.url !== '/auth/me') {
                            removeToken();
                            window.location.href = '/login';
                            return Promise.reject(error);
                        }
                    }
                }
            }
            
            // Get the latest token (might have been refreshed)
            const currentToken = getToken();
            if (currentToken) {
                config.headers.Authorization = `Bearer ${currentToken}`;
            }
        }
        
        // Log request details
        console.log('Request:', {
            url: config.url,
            method: config.method,
            baseURL: config.baseURL,
            headers: config.headers
        });
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => {
        console.log('Response:', {
            status: response.status,
            data: response.data
        });
        return response;
    },
    async (error) => {
        // Handle 401 errors (except for auth endpoints)
        if (error.response && 
            error.response.status === 401 && 
            error.config && 
            !error.config.url.includes('/auth/refresh') && 
            !error.config.url.includes('/auth/login')) {
            
            console.log('Received 401 error, attempting to refresh token');
            
            // Try to refresh the token
            try {
                if (!isRefreshing) {
                    isRefreshing = true;
                    const refreshed = await refreshAuthToken();
                    isRefreshing = false;
                    
                    if (refreshed) {
                        console.log('Token refreshed successfully, retrying request');
                        
                        // Retry the original request with new token
                        const token = getToken();
                        if (token) {
                            error.config.headers.Authorization = `Bearer ${token}`;
                        }
                        
                        // Process any pending requests
                        processPendingRequests();
                        
                        // Retry the original request
                        return axios(error.config);
                    } else {
                        console.log('Token refresh failed, redirecting to login');
                        removeToken();
                        window.location.href = '/login';
                        return Promise.reject(error);
                    }
                } else {
                    // Token refresh already in progress, add to pending queue
                    return new Promise((resolve, reject) => {
                        pendingRequests.push({ resolve, reject });
                    }).then(() => {
                        // After token refresh completes successfully, retry request
                        const token = getToken();
                        if (token) {
                            error.config.headers.Authorization = `Bearer ${token}`;
                        }
                        return axios(error.config);
                    }).catch(() => {
                        // If token refresh failed
                        return Promise.reject(error);
                    });
                }
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                isRefreshing = false;
                removeToken();
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }
        
        console.error('Response error:', error.response || error);
        return Promise.reject(error);
    }
);

// Custom error class for API errors
export class APIError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  requiresAuth?: boolean
  headers?: Record<string, string>
  timeout?: number // Optional timeout in milliseconds
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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
    console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, {
      hasBody: !!options.body,
      headers: {
        contentType: requestHeaders['Content-Type'],
        accept: requestHeaders['Accept'],
        hasAuth: !!requestHeaders['Authorization']
      }
    });
    
    // Apply custom timeout if specified
    const timeout = options.timeout || 15000; // Default is 15 seconds
    
    const response = await apiClient.request({
      url: endpoint,
      method: options.method || 'GET',
      headers: requestHeaders,
      data: options.body ? JSON.parse(options.body as string) : undefined,
      withCredentials: true,
      timeout: timeout
    });

    console.log(`API Response: ${response.status} ${endpoint}`, {
      dataSize: JSON.stringify(response.data).length,
      status: response.status
    });
    
    return response.status === 204 ? undefined as T : response.data as T
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(`API Error: ${options.method || 'GET'} ${endpoint}`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorDetail = error.response?.data?.detail || error.message;
      throw new APIError(errorDetail, error.response?.status || 500);
    }
    console.error(`Non-Axios API Error: ${endpoint}`, error);
    throw error;
  }
}