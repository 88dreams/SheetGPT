import axios from 'axios';
import { createCachedApiClient, createQueryCacheKey } from '../apiCache';

// Mock axios
jest.mock('axios', () => {
  const originalModule = jest.requireActual('axios');
  return {
    ...originalModule,
    create: jest.fn(() => ({
      defaults: {
        headers: {
          common: {}
        }
      },
      interceptors: {
        request: {
          use: jest.fn(),
          eject: jest.fn()
        },
        response: {
          use: jest.fn(),
          eject: jest.fn()
        }
      },
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn()
    }))
  };
});

describe('API Caching Utilities', () => {
  let axiosInstance: any;
  let cachedApi: any;
  let requestInterceptor: any;
  let responseInterceptor: any;
  
  beforeEach(() => {
    // Create a new axios instance for each test
    axiosInstance = axios.create();
    
    // Mock axios interceptors.request.use implementation
    axiosInstance.interceptors.request.use.mockImplementation((successFn) => {
      requestInterceptor = successFn;
      return 0; // Interceptor ID
    });
    
    // Mock axios interceptors.response.use implementation
    axiosInstance.interceptors.response.use.mockImplementation((successFn, errorFn) => {
      responseInterceptor = { 
        success: successFn, 
        error: errorFn 
      };
      return 0; // Interceptor ID
    });
    
    // Create the cached client
    cachedApi = createCachedApiClient(axiosInstance, {
      ttl: 60, // 1 minute TTL for tests
      storage: 'memory' // Use memory storage for tests
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Request Caching', () => {
    it('should store responses in cache', async () => {
      // Response to be cached
      const mockResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test', method: 'get' }
      };
      
      // Mock request implementation to return the response
      axiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      // Prepare request config
      const requestConfig = {
        url: '/test',
        method: 'get'
      };
      
      // Apply request interceptor (simulates making a request)
      const modifiedConfig = requestInterceptor(requestConfig);
      
      // Simulate successful response
      const result = await responseInterceptor.success({
        ...mockResponse,
        config: modifiedConfig
      });
      
      // Check cache stats - should have 1 miss (for the first request)
      expect(cachedApi.getCacheStats().misses).toBe(1);
      expect(cachedApi.getCacheStats().hits).toBe(0);
      expect(cachedApi.getCacheStats().size).toBe(1);
      
      // Make a second request to hit the cache
      axiosInstance.request.mockRejectedValueOnce(new Error("This should not be called"));
      
      // Apply request interceptor again
      const secondConfig = requestInterceptor(requestConfig);
      
      // For a cached response, the request should be aborted
      expect(secondConfig.fromCache).toBeTruthy();
      
      // Check cache stats - should now have 1 hit
      expect(cachedApi.getCacheStats().hits).toBe(1);
    });
    
    it('should skip caching for non-GET requests', () => {
      // Prepare POST request config
      const postConfig = {
        url: '/test',
        method: 'post',
        data: { name: 'Test Data' }
      };
      
      // Apply request interceptor
      const modifiedConfig = requestInterceptor(postConfig);
      
      // Should not be marked for caching
      expect(modifiedConfig.fromCache).toBeUndefined();
    });
    
    it('should clear the cache', async () => {
      // Populate cache with a mock response
      const mockResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test', method: 'get' }
      };
      
      // Mock request implementation
      axiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      // Make a request to populate the cache
      const requestConfig = { url: '/test', method: 'get' };
      const modifiedConfig = requestInterceptor(requestConfig);
      await responseInterceptor.success({
        ...mockResponse,
        config: modifiedConfig
      });
      
      // Verify cache has an entry
      expect(cachedApi.getCacheStats().size).toBe(1);
      
      // Clear the cache
      cachedApi.clearCache();
      
      // Verify cache is empty
      expect(cachedApi.getCacheStats().size).toBe(0);
    });
  });
  
  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests with same config', async () => {
      // Mock response for the canonical request
      const mockResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test', method: 'get' }
      };
      
      // Prepare request config
      const requestConfig = {
        url: '/test',
        method: 'get'
      };
      
      // Mock request to return a promise we control
      let resolveRequest: Function;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      axiosInstance.request.mockReturnValueOnce(requestPromise);
      
      // First request - should become the canonical request
      const firstConfig = requestInterceptor(requestConfig);
      expect(firstConfig.dedupeKey).toBeTruthy();
      expect(firstConfig.controller).toBeTruthy();
      
      // Call the actual request method to register the in-flight request
      cachedApi.client.request(firstConfig);
      
      // Second request with same config - should be deduplicated
      const secondConfig = requestInterceptor(requestConfig);
      expect(secondConfig.deduplicated).toBeTruthy();
      expect(secondConfig.dedupeKey).toBeUndefined(); // Not the canonical request
      
      // Resolve the first request
      if (resolveRequest) {
        resolveRequest(mockResponse);
      }
      
      // Apply response interceptor to complete the canonical request
      const result = await responseInterceptor.success({
        ...mockResponse,
        config: firstConfig
      });
      
      // Result should match the mock response
      expect(result).toEqual(mockResponse);
    });
  });
  
  describe('createQueryCacheKey', () => {
    it('should create consistent cache keys from query keys', () => {
      const key1 = createQueryCacheKey(['entities', { type: 'user', id: 1 }]);
      const key2 = createQueryCacheKey(['entities', { type: 'user', id: 1 }]);
      
      // Same input should produce same output
      expect(key1).toBe(key2);
      
      // Different input should produce different output
      const key3 = createQueryCacheKey(['entities', { type: 'user', id: 2 }]);
      expect(key1).not.toBe(key3);
    });
    
    it('should include query options in the cache key', () => {
      const key1 = createQueryCacheKey(['entities'], { staleTime: 1000 });
      const key2 = createQueryCacheKey(['entities'], { staleTime: 2000 });
      
      // Different options should produce different keys
      expect(key1).not.toBe(key2);
    });
  });
});