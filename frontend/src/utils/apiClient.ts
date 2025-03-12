/// <reference types="vite/client" />

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Determine if we're running in Docker by checking the hostname
const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// For browser access, we need to use localhost even when running in Docker
// This is because the browser can't resolve Docker container names
// Handle both browser and test environments
const getApiUrl = () => {
  try {
    // In browser environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_API_URL || 'http://localhost:8000';
    }
  } catch (e) {
    // In test environment
    console.log('Running in test environment, using default API URL');
  }
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

// Add request interceptor for logging
apiClient.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
    (error) => {
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