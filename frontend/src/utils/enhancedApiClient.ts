/**
 * Enhanced API Client with caching and deduplication
 *
 * This module provides an enhanced API client that integrates:
 * 1. Caching for repeated requests
 * 2. Request deduplication for concurrent identical requests
 * 3. Automatic retries for network failures
 * 4. Prefetching capability for anticipated requests
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createCachedApiClient, CachedApiClient } from './apiCache';
import { ApiError, NetworkError } from './errors';

// Default base URL (overridable)
const DEFAULT_BASE_URL = '/api/v1';

// Default request timeout
const DEFAULT_TIMEOUT = 15000; // 15 seconds

/**
 * Configuration options for the enhanced API client
 */
export interface EnhancedApiClientOptions {
  /** Base URL for API requests */
  baseURL?: string;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Whether to automatically retry failed requests */
  autoRetry?: boolean;
  
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Whether to enable request caching */
  enableCaching?: boolean;
  
  /** TTL for cached responses in seconds */
  cacheTTL?: number;
  
  /** Storage mechanism for cache */
  cacheStorage?: 'memory' | 'localStorage' | 'sessionStorage';
  
  /** Whether to enable request deduplication */
  enableDeduplication?: boolean;
  
  /** Custom headers to include with all requests */
  headers?: Record<string, string>;
  
  /** Whether to include credentials with requests */
  withCredentials?: boolean;
}

/**
 * Create an enhanced API client with advanced features
 */
export function createEnhancedApiClient(options: EnhancedApiClientOptions = {}) {
  // Merge options with defaults
  const {
    baseURL = DEFAULT_BASE_URL,
    timeout = DEFAULT_TIMEOUT,
    autoRetry = true,
    maxRetries = 3,
    enableCaching = true,
    cacheTTL = 300, // 5 minutes
    cacheStorage = 'memory',
    enableDeduplication = true,
    headers = {},
    withCredentials = true
  } = options;
  
  // Create base axios instance
  const axiosInstance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    withCredentials
  });
  
  // Add retry logic
  if (autoRetry) {
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Extract config and create a fresh copy
        const { config } = error;
        if (!config) return Promise.reject(error);
        
        // Don't retry if we've explicitly cancelled the request
        if (error.message === 'canceled' || 
            (error.code && error.code === 'ERR_CANCELED')) {
          return Promise.reject(error);
        }
        
        // Get the number of retries from config or initialize it
        const retryCount = config.retryCount || 0;
        
        // Check if we should retry (network error or 5xx)
        const shouldRetry = (
          // Network errors
          error.code === 'ECONNABORTED' || 
          !error.response || 
          // Server errors (5xx)
          (error.response && error.response.status >= 500 && error.response.status < 600)
        );
        
        // Only retry if we haven't exceeded max retries and we should retry
        if (retryCount < maxRetries && shouldRetry) {
          // Increment the retry count
          const newConfig = {
            ...config,
            retryCount: retryCount + 1
          };
          
          // Exponential backoff delay: 200ms, 400ms, 800ms, etc.
          const delay = Math.pow(2, retryCount) * 100;
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry the request
          return axiosInstance.request(newConfig);
        }
        
        // Format and reject with appropriate error types
        if (!error.response) {
          // Network error
          // Construct a more informative message if error.code is present
          const networkErrorMessage = error.code 
            ? `${error.message || 'Network error'} (Code: ${error.code})` 
            : error.message || 'Network error';
          return Promise.reject(new NetworkError(networkErrorMessage));
        } else {
          // API error with response
          return Promise.reject(new ApiError(
            error.response.data?.message || error.message || 'API error',
            error.response.status,
            error.response.data?.details || {},
            error.response.config
          ));
        }
      }
    );
  }
  
  // Apply caching and deduplication if enabled
  let enhancedClient: CachedApiClient | { client: AxiosInstance; clearCache: () => void; getCacheStats: () => {}; prefetch: () => Promise<void> };
  
  if (enableCaching || enableDeduplication) {
    enhancedClient = createCachedApiClient(
      axiosInstance,
      enableCaching ? {
        ttl: cacheTTL,
        storage: cacheStorage,
        shouldSkipCache: (config) => {
          // Skip cache for non-GET requests or requests with 'no-cache' header
          const method = (config.method || 'get').toLowerCase();
          const noCache = config.headers?.['Cache-Control'] === 'no-cache';
          return method !== 'get' || noCache;
        }
      } : undefined,
      enableDeduplication ? {
        shouldSkipDedupe: (config) => {
          // Skip deduplication for non-GET/HEAD requests
          const method = (config.method || 'get').toLowerCase();
          return !(method === 'get' || method === 'head');
        }
      } : undefined
    );
  } else {
    // Provide a default structure if caching/dedupe is off
    enhancedClient = {
      client: axiosInstance,
      clearCache: () => console.warn('Caching not enabled, clearCache does nothing.'),
      getCacheStats: () => ({ hits: 0, misses: 0, size: 0, keys: [] }),
      prefetch: async () => console.warn('Caching not enabled, prefetch does nothing.')
    };
  }
  
  // Create the final API client interface
  const apiClient = {
    // Base HTTP methods
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
      const response = await enhancedClient.client.get<T>(url, config);
      return response.data;
    },
    
    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
      const response = await enhancedClient.client.post<T>(url, data, config);
      return response.data;
    },
    
    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
      const response = await enhancedClient.client.put<T>(url, data, config);
      return response.data;
    },
    
    async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
      const response = await enhancedClient.client.patch<T>(url, data, config);
      return response.data;
    },
    
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
      const response = await enhancedClient.client.delete<T>(url, config);
      return response.data;
    },
    
    // Additional utility methods
    async request<T = any>(config: AxiosRequestConfig): Promise<T> {
      const response = await enhancedClient.client.request<T>(config);
      return response.data;
    },
    
    // Cache management (if enabled)
    clearCache: enhancedClient.clearCache || (() => {}),
    getCacheStats: enhancedClient.getCacheStats || (() => ({})),
    
    // Prefetching (load data into cache without using the result)
    async prefetch(url: string, config?: AxiosRequestConfig): Promise<void> {
      if (enhancedClient.prefetch) {
        await enhancedClient.prefetch({ url, method: 'get', ...config });
      } else {
        try {
          await enhancedClient.client.get(url, { ...config, signal: AbortSignal.timeout(2000) });
        } catch (error) {
          // Ignore errors during prefetch
          console.debug('Prefetch error:', error);
        }
      }
    },
    
    // Expose the underlying axios instance
    axiosInstance: enhancedClient.client
  };
  
  return apiClient;
}

// Create a default enhanced API client
export const enhancedApi = createEnhancedApiClient();