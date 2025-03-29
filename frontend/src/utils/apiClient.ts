/// <reference types="vite/client" />

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { isTokenExpiredOrExpiringSoon, refreshAuthToken } from './tokenRefresh';

// Determine if we're running in Docker by checking the hostname
const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// For browser access, we need to use localhost even when running in Docker
// This is because the browser can't resolve Docker container names
// Handle all environments safely
const getApiUrl = () => {
  // IMPORTANT: From browser context, we always use relative URLs
  // This ensures we use the same hostname that served the frontend
  if (typeof window !== 'undefined') {
    // When running in a browser, just use a relative URL
    // This will make requests go to the same host serving the frontend
    console.log('Browser environment detected, using relative URL');
    return '';
  }
  
  // This code will only run in server-side contexts like SSR or tests
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    console.log('Error accessing import.meta.env:', e);
  }
  
  // Default fallback for server-side
  console.log('Using default localhost API URL');
  return 'http://localhost:8000';
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
  resolve: (value?: unknown) => void;
  reject: (reason?: Error) => void;
}> = [];

// Process pending requests after token refresh
const processPendingRequests = (error: Error | null = null) => {
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
            url: response.config.url,
            method: response.config.method,
        });
        return response;
    },
    async (error) => {
        // Handle 401 errors (except for auth endpoints)
        if (error.response && 
            error.response.status === 401 && 
            error.config && 
            !error.config.url?.includes('/auth/refresh') && 
            !error.config.url?.includes('/auth/login')) {
            
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
                        if (token && error.config) {
                            error.config.headers = error.config.headers || {};
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
                    return new Promise<unknown>((resolve, reject) => {
                        pendingRequests.push({ resolve, reject });
                    }).then(() => {
                        // After token refresh completes successfully, retry request
                        const token = getToken();
                        if (token && error.config) {
                            error.config.headers = error.config.headers || {};
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
        
        // Log detailed error information
        if (error.response) {
            console.error('API Error Response:', {
                status: error.response.status,
                url: error.config?.url,
                method: error.config?.method,
                data: error.response.data,
            });
        } else if (error.request) {
            console.error('API Request Error (No Response):', {
                url: error.config?.url,
                method: error.config?.method,
            });
        } else {
            console.error('API Error:', error.message);
        }
        
        return Promise.reject(error);
    }
);

// Import our new standardized error utilities
import { ApiError, handleError } from './errors';

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  requiresAuth?: boolean;
  headers?: Record<string, string>;
  timeout?: number; // Optional timeout in milliseconds
  responseType?: 'json' | 'blob'; // Response type (default is 'json')
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
      timeout: timeout,
      responseType: options.responseType === 'blob' ? 'blob' : 'json'
    });

    console.log(`API Response: ${response.status} ${endpoint}`, {
      dataType: options.responseType || 'json',
      dataSize: options.responseType === 'blob' 
        ? response.data?.size || 'unknown' 
        : typeof response.data === 'object' ? JSON.stringify(response.data).length : 'unknown',
      status: response.status
    });
    
    return response.status === 204 ? undefined as unknown as T : response.data as T;
  } catch (error) {
    // Use our standardized error handling
    const appError = handleError(error);
    console.error(`API Request failed: ${options.method || 'GET'} ${endpoint}`, appError);
    throw appError;
  }
}