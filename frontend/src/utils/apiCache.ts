/**
 * API caching and request deduplication utilities
 *
 * This utility provides advanced caching and deduplication for API requests
 * to improve performance and reduce redundant network traffic.
 */

import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface CacheEntry {
  response: AxiosResponse;
  timestamp: number;
  expiresAt: number;
}

interface DedupeEntry {
  promise: Promise<AxiosResponse<any>>;
  controllers: AbortController[];
}

interface CacheOptions {
  /** Cache TTL in seconds (default: 300 - 5 minutes) */
  ttl?: number;
  
  /** Cache key generator function */
  cacheKeyFn?: (config: AxiosRequestConfig) => string;
  
  /** Bypass cache for specific requests */
  shouldSkipCache?: (config: AxiosRequestConfig) => boolean;
  
  /** Storage mechanism (defaults to in-memory cache) */
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  
  /** Prefix for cache keys when using localStorage or sessionStorage */
  storageKeyPrefix?: string;
}

interface DedupeOptions {
  /** Key generator function for deduplicating requests */
  dedupeKeyFn?: (config: AxiosRequestConfig) => string;
  
  /** Bypass deduplication for specific requests */
  shouldSkipDedupe?: (config: AxiosRequestConfig) => boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: string[];
}

const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  ttl: 300, // 5 minutes
  cacheKeyFn: (config) => {
    // Create a key based on method, url and serialized params/data
    const method = config.method || 'get';
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? JSON.stringify(config.data) : '';
    return `${method}:${url}:${params}:${data}`;
  },
  shouldSkipCache: (config) => {
    // Skip cache for non-GET requests by default
    return (config.method || 'get').toLowerCase() !== 'get';
  },
  storage: 'memory',
  storageKeyPrefix: 'api_cache_'
};

const DEFAULT_DEDUPE_OPTIONS: Required<DedupeOptions> = {
  dedupeKeyFn: (config) => {
    // Create a key based on method, url and serialized params/data
    const method = config.method || 'get';
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? JSON.stringify(config.data) : '';
    return `${method}:${url}:${params}:${data}`;
  },
  shouldSkipDedupe: (config) => {
    // Skip deduplication for non-GET/HEAD requests
    const method = (config.method || 'get').toLowerCase();
    return !(method === 'get' || method === 'head');
  }
};

// Add an interface for the return type of createCachedApiClient
export interface CachedApiClient {
  client: AxiosInstance;
  clearCache: (pattern?: RegExp) => void;
  getCacheStats: () => CacheStats;
  prefetch: (config: AxiosRequestConfig) => Promise<void>;
}

/**
 * Creates an enhanced API client with caching and request deduplication
 */
export function createCachedApiClient(
  axiosInstance: AxiosInstance,
  cacheOptions: CacheOptions = {},
  dedupeOptions: DedupeOptions = {}
): CachedApiClient {
  // Merge options with defaults
  const options: Required<CacheOptions> = { ...DEFAULT_CACHE_OPTIONS, ...cacheOptions };
  const dedupeOpts: Required<DedupeOptions> = { ...DEFAULT_DEDUPE_OPTIONS, ...dedupeOptions };
  
  // In-memory cache
  const memoryCache = new Map<string, CacheEntry>();
  
  // In-flight requests map for deduplication
  const inFlightRequests = new Map<string, DedupeEntry>();
  
  // Cache statistics
  const stats = {
    hits: 0,
    misses: 0
  };
  
  /**
   * Get a value from the cache
   */
  const getCacheEntry = (key: string): CacheEntry | undefined => {
    const now = Date.now();
    
    if (options.storage === 'memory') {
      const entry = memoryCache.get(key);
      if (entry && entry.expiresAt > now) {
        return entry;
      }
      // Remove expired entry
      if (entry) {
        memoryCache.delete(key);
      }
      return undefined;
    }
    
    // Storage is localStorage or sessionStorage
    const storage = options.storage === 'localStorage' ? localStorage : sessionStorage;
    try {
      const storedValue = storage.getItem(`${options.storageKeyPrefix}${key}`);
      if (!storedValue) return undefined;
      
      const entry = JSON.parse(storedValue) as CacheEntry;
      if (entry.expiresAt > now) {
        return entry;
      }
      
      // Remove expired entry
      storage.removeItem(`${options.storageKeyPrefix}${key}`);
    } catch (error) {
      console.error('Error retrieving from cache', error);
    }
    
    return undefined;
  };
  
  /**
   * Set a value in the cache
   */
  const setCacheEntry = (key: string, entry: CacheEntry): void => {
    if (options.storage === 'memory') {
      memoryCache.set(key, entry);
      return;
    }
    
    // Storage is localStorage or sessionStorage
    const storage = options.storage === 'localStorage' ? localStorage : sessionStorage;
    try {
      storage.setItem(`${options.storageKeyPrefix}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Error storing in cache', error);
      
      // If storage is full, clear older entries
      if (error instanceof DOMException && (
        error.name === 'QuotaExceededError' || 
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        try {
          // Get all keys with our prefix
          const keys = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(options.storageKeyPrefix)) {
              keys.push(key);
            }
          }
          
          // Sort by timestamp (oldest first)
          const sortedKeys = keys.sort((a, b) => {
            try {
              const aData = JSON.parse(storage.getItem(a) || '{}') as CacheEntry;
              const bData = JSON.parse(storage.getItem(b) || '{}') as CacheEntry;
              return (aData.timestamp || 0) - (bData.timestamp || 0);
            } catch {
              return 0;
            }
          });
          
          // Remove 20% of oldest entries
          const toRemove = Math.max(1, Math.ceil(sortedKeys.length * 0.2));
          for (let i = 0; i < toRemove; i++) {
            if (sortedKeys[i]) {
              storage.removeItem(sortedKeys[i]);
            }
          }
          
          // Try setting again
          storage.setItem(`${options.storageKeyPrefix}${key}`, JSON.stringify(entry));
        } catch (clearError) {
          console.error('Failed to clear cache and retry', clearError);
        }
      }
    }
  };
  
  /**
   * Clear the cache (all entries or matching a pattern)
   */
  const clearCache = (pattern?: RegExp): void => {
    if (options.storage === 'memory') {
      if (!pattern) {
        memoryCache.clear();
      } else {
        for (const key of memoryCache.keys()) {
          if (pattern.test(key)) {
            memoryCache.delete(key);
          }
        }
      }
      return;
    }
    
    // Storage is localStorage or sessionStorage
    const storage = options.storage === 'localStorage' ? localStorage : sessionStorage;
    const keysToRemove = [];
    
    // Collect keys to remove
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(options.storageKeyPrefix)) {
        if (!pattern || pattern.test(key.substring(options.storageKeyPrefix.length))) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove collected keys
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  };
  
  /**
   * Get cache statistics
   */
  const getCacheStats = (): CacheStats => {
    if (options.storage === 'memory') {
      return {
        hits: stats.hits,
        misses: stats.misses,
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys())
      };
    }
    
    // Storage is localStorage or sessionStorage
    const storage = options.storage === 'localStorage' ? localStorage : sessionStorage;
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(options.storageKeyPrefix)) {
        keys.push(key.substring(options.storageKeyPrefix.length));
      }
    }
    
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: keys.length,
      keys
    };
  };
  
  // Add request interceptor for caching and deduplication
  axiosInstance.interceptors.request.use(
    (config) => {
      // Create a copy of the config to avoid mutating the original
      const configCopy = { ...config };
      
      // Add AbortController for cancellation support
      const controller = new AbortController();
      configCopy.signal = controller.signal;
      
      // Check if we should cache this request
      const shouldCache = !options.shouldSkipCache(configCopy);
      
      if (shouldCache) {
        const cacheKey = options.cacheKeyFn(configCopy);
        
        // Check cache for a valid entry
        const cachedEntry = getCacheEntry(cacheKey);
        if (cachedEntry) {
          // Create a cached response
          const cachedResponse = cachedEntry.response;
          
          // Set custom property to identify cached responses
          (configCopy as any).cachedResponse = cachedResponse;
          (configCopy as any).fromCache = true;
          
          // Update stats
          stats.hits++;
          
          // Cancel the real request since we'll use the cached response
          controller.abort('Request resolved from cache');
        } else {
          // Update stats
          stats.misses++;
        }
      }
      
      // Check if we should deduplicate this request
      const shouldDedupe = !dedupeOpts.shouldSkipDedupe(configCopy);
      
      if (shouldDedupe) {
        const dedupeKey = dedupeOpts.dedupeKeyFn(configCopy);
        
        // Check if we already have an in-flight request for this key
        const existingRequest = inFlightRequests.get(dedupeKey);
        if (existingRequest) {
          // Add this controller to the list of controllers for the existing request
          existingRequest.controllers.push(controller);
          
          // Set custom property to identify deduplicated requests
          (configCopy as any).duplicateRequestHandler = existingRequest.promise;
          (configCopy as any).deduplicated = true;
          
          // Cancel the real request since we'll use the existing one
          controller.abort('Request deduplicated');
        } else {
          // This becomes the canonical request for this dedupeKey
          // We'll set up the in-flight entry when the response interceptor runs
          (configCopy as any).dedupeKey = dedupeKey;
          (configCopy as any).controller = controller;
        }
      }
      
      return configCopy;
    },
    (error) => Promise.reject(error)
  );
  
  // Add response interceptor for caching and deduplication
  axiosInstance.interceptors.response.use(
    (response) => {
      const config = response.config;
      
      // If this is a cached response, return it directly
      if ((config as any).fromCache) {
        return (config as any).cachedResponse;
      }
      
      // If this is a deduplicated request, return the promise for the original request
      if ((config as any).deduplicated) {
        return (config as any).duplicateRequestHandler;
      }
      
      // Handle the canonical request for a deduplicated set
      const dedupeKey = (config as any).dedupeKey;
      if (dedupeKey) {
        // Remove the in-flight entry now that we have a response
        inFlightRequests.delete(dedupeKey);
      }
      
      // Cache the response if needed
      const shouldCache = !options.shouldSkipCache(config);
      if (shouldCache) {
        const cacheKey = options.cacheKeyFn(config);
        const now = Date.now();
        const ttlMs = options.ttl * 1000;
        
        // Create cache entry
        const entry: CacheEntry = {
          response: { ...response }, // Clone to avoid reference issues
          timestamp: now,
          expiresAt: now + ttlMs
        };
        
        // Store in cache
        setCacheEntry(cacheKey, entry);
      }
      
      return response;
    },
    (error) => {
      // Handle aborted requests for caching and deduplication
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        const config = error.config;
        
        // If this was aborted because we found a cached response, return that
        if ((config as any).fromCache) {
          return Promise.resolve((config as any).cachedResponse);
        }
        
        // If this was aborted because we deduplicated the request, return the promise for the original
        if ((config as any).deduplicated) {
          return (config as any).duplicateRequestHandler;
        }
      }
      
      // Handle errors for deduplicated requests
      const dedupeKey = error.config && (error.config as any).dedupeKey;
      if (dedupeKey) {
        // Remove the in-flight entry now that we have an error
        inFlightRequests.delete(dedupeKey);
      }
      
      return Promise.reject(error);
    }
  );
  
  // Track the request in the in-flight requests map for deduplication
  const originalRequest = axiosInstance.request;
  axiosInstance.request = function<T = any, R = AxiosResponse<T, any>, D = any>(
    config: AxiosRequestConfig<D>
  ): Promise<R> {
    const requestPromise = originalRequest.call(this, config) as Promise<R>;
    
    const dedupeKey = (config as any).dedupeKey;
    const controller = (config as any).controller;
    
    if (dedupeKey && controller) {
      inFlightRequests.set(dedupeKey, {
        promise: requestPromise as unknown as Promise<AxiosResponse<any>>,
        controllers: [controller]
      });
    }
    return requestPromise;
  };
  
  // Return enhanced client with additional methods
  return {
    client: axiosInstance,
    clearCache,
    getCacheStats,
    
    // Helper to prefetch and cache a request
    prefetch: async (config: AxiosRequestConfig): Promise<void> => {
      try {
        await axiosInstance.request(config);
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    }
  };
}

/**
 * Creates a cache key for React Query based on the query key and options
 */
export function createQueryCacheKey(queryKey: unknown[], queryOptions?: object): string {
  // Create a string from the query key and options
  const keyString = JSON.stringify(queryKey);
  const optionsString = queryOptions ? JSON.stringify(queryOptions) : '';
  return `${keyString}:${optionsString}`;
}

/**
 * Cache interface for storing and retrieving data
 */
export interface CacheInterface {
  /** Get a value from the cache */
  get<T = any>(key: string): T | undefined;
  
  /** Set a value in the cache */
  set<T = any>(key: string, value: T, ttlSeconds?: number): void;
  
  /** Check if a key exists in the cache */
  has(key: string): boolean;
  
  /** Delete a value from the cache */
  delete(key: string): void;
  
  /** Clear all values from the cache */
  clear(): void;
  
  /** Get all keys in the cache */
  keys(): string[];
}

/**
 * In-memory cache implementation
 */
export class MemoryCache implements CacheInterface {
  private cache = new Map<string, { value: any; expiresAt?: number }>();
  
  get<T = any>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Return undefined if the item doesn't exist
    if (!item) return undefined;
    
    // Check if the item has expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  set<T = any>(key: string, value: T, ttlSeconds = 300): void {
    const expiresAt = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.cache.set(key, { value, expiresAt });
  }
  
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    // Check if the item exists and hasn't expired
    if (!item) return false;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  keys(): string[] {
    // Only return keys for non-expired items
    const result: string[] = [];
    const now = Date.now();
    
    this.cache.forEach((item, key) => {
      if (!item.expiresAt || item.expiresAt > now) {
        result.push(key);
      }
    });
    
    return result;
  }
}

/**
 * Global API cache instance
 */
export const apiCache = new MemoryCache();