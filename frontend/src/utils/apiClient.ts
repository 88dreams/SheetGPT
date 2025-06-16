/// <reference types="vite/client" />

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import { isTokenExpiredOrExpiringSoon, refreshAuthToken, ensureValidToken } from './tokenRefresh';

// Determine if we're running in Docker by checking the hostname
const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// IMPORTANT: All mock data and development fallbacks have been removed
// In Docker, we use the VITE_API_URL environment variable or a relative URL
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    // For local dev, we target the backend service directly on port 8000 with HTTPS
    return 'https://localhost:8000';
  }
  // For production/other envs, use the Vite env variable.
  return process.env.VITE_API_URL || '';
};

const API_URL = getApiUrl();
const API_PREFIX = '/api/v1';

const fullBaseURL = `${API_URL}${API_PREFIX}`;

console.log('API configuration:', {
  isDocker,
  API_URL,
  API_PREFIX,
  fullBaseURL: fullBaseURL,
  hostname: window.location.hostname,
});

// Create an Axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
    baseURL: fullBaseURL,
    withCredentials: true,
    timeout: 40000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Export as default and as named export for backward compatibility
export default apiClient;
export { apiClient };

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
        // Get the token and check for mock tokens (which should be removed)
        const token = getToken();
        if (token && token.startsWith('dev_mock_token_')) {
            console.warn('Found mock token - removing it since mock data is no longer supported');
            removeToken();
            // Redirect to login page since the token is invalid
            window.location.href = '/sheetgpt/login';
            return Promise.reject(new Error('Mock tokens are not supported'));
        }
        
        // Check if token is expired or expiring soon and refresh if needed
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
                            window.location.href = '/sheetgpt/login';
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
            headers: {
                contentType: config.headers['Content-Type'],
                accept: config.headers['Accept'],
                hasAuth: !!config.headers.Authorization
            }
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
                        window.location.href = '/sheetgpt/login';
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
                window.location.href = '/sheetgpt/login';
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

// Re-export ApiError as APIError for backward compatibility
export { ApiError as APIError };

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  requiresAuth?: boolean;
  headers?: Record<string, string>;
  timeout?: number; // Optional timeout in milliseconds
  responseType?: 'json' | 'blob' | 'text'; // Response type (default is 'json')
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
    const timeout = options.timeout || 40000; // Increased default from 30000ms to 40000ms
    
    const response = await apiClient.request({
      url: endpoint,
      method: options.method || 'GET',
      headers: requestHeaders,
      data: options.body ? 
        (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : 
        undefined,
      withCredentials: true,
      timeout: timeout,
      responseType: options.responseType === 'blob' ? 'blob' : 
                   options.responseType === 'text' ? 'text' : 'json'
    });

    console.log(`API Response: ${response.status} ${endpoint}`, {
      dataType: options.responseType || 'json',
      dataSize: options.responseType === 'blob' 
        ? response.data?.size || 'unknown' 
        : options.responseType === 'text'
          ? response.data?.length || 'unknown'
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