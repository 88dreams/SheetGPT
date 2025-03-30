import axios from 'axios';
import { createEnhancedApiClient } from '../enhancedApiClient';
import { APIError, NetworkError } from '../errors';

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
          use: jest.fn((fn) => fn),
          eject: jest.fn()
        },
        response: {
          use: jest.fn((successFn, errorFn) => {
            // Store the error handler for testing
            (axios as any).errorHandler = errorFn;
            return { success: successFn, error: errorFn };
          }),
          eject: jest.fn()
        }
      },
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    }))
  };
});

describe('Enhanced API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Basic functionality', () => {
    it('should create an enhanced API client with default options', () => {
      const api = createEnhancedApiClient();
      expect(api).toBeDefined();
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: '/api/v1',
        timeout: 15000
      }));
    });
    
    it('should allow custom configuration', () => {
      const api = createEnhancedApiClient({
        baseURL: '/custom-api',
        timeout: 5000,
        headers: { 'X-Custom-Header': 'value' }
      });
      
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: '/custom-api',
        timeout: 5000,
        headers: expect.objectContaining({
          'X-Custom-Header': 'value'
        })
      }));
    });
  });
  
  describe('HTTP methods', () => {
    let api: ReturnType<typeof createEnhancedApiClient>;
    
    beforeEach(() => {
      api = createEnhancedApiClient({
        // Disable caching and deduplication for simpler testing
        enableCaching: false,
        enableDeduplication: false
      });
    });
    
    it('should forward GET requests to axios', async () => {
      const mockData = { id: 1, name: 'Test' };
      (api.axiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: mockData });
      
      const result = await api.get('/test');
      
      expect(api.axiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });
    
    it('should forward POST requests to axios', async () => {
      const requestData = { name: 'New Test' };
      const responseData = { id: 2, name: 'New Test' };
      (api.axiosInstance.post as jest.Mock).mockResolvedValueOnce({ data: responseData });
      
      const result = await api.post('/test', requestData);
      
      expect(api.axiosInstance.post).toHaveBeenCalledWith('/test', requestData, undefined);
      expect(result).toEqual(responseData);
    });
    
    it('should forward PUT requests to axios', async () => {
      const requestData = { id: 1, name: 'Updated Test' };
      const responseData = { id: 1, name: 'Updated Test' };
      (api.axiosInstance.put as jest.Mock).mockResolvedValueOnce({ data: responseData });
      
      const result = await api.put('/test/1', requestData);
      
      expect(api.axiosInstance.put).toHaveBeenCalledWith('/test/1', requestData, undefined);
      expect(result).toEqual(responseData);
    });
    
    it('should forward DELETE requests to axios', async () => {
      const responseData = { success: true };
      (api.axiosInstance.delete as jest.Mock).mockResolvedValueOnce({ data: responseData });
      
      const result = await api.delete('/test/1');
      
      expect(api.axiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(responseData);
    });
  });
  
  describe('Error handling and retries', () => {
    let api: ReturnType<typeof createEnhancedApiClient>;
    let errorHandler: Function;
    
    beforeEach(() => {
      api = createEnhancedApiClient({
        enableCaching: false,
        enableDeduplication: false,
        autoRetry: true,
        maxRetries: 2
      });
      
      // Get the error handler set up in the interceptor
      errorHandler = (axios as any).errorHandler;
    });
    
    it('should transform network errors', async () => {
      const networkError = {
        message: 'Network Error',
        code: 'ECONNABORTED',
        config: { url: '/test', method: 'get' }
      };
      
      try {
        // Call the error handler directly with a network error
        await errorHandler(networkError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect(error.message).toBe('Network Error');
        expect(error.code).toBe('ECONNABORTED');
      }
    });
    
    it('should transform API errors', async () => {
      const apiError = {
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          data: {
            message: 'Entity not found',
            details: { id: 'Invalid ID' }
          },
          config: { url: '/test/999', method: 'get' }
        },
        config: { url: '/test/999', method: 'get' }
      };
      
      try {
        // Call the error handler directly with an API error
        await errorHandler(apiError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect(error.message).toBe('Entity not found');
        expect(error.status).toBe(404);
        expect(error.details).toEqual({ id: 'Invalid ID' });
      }
    });
    
    it('should retry on 5xx errors', async () => {
      const serverError = {
        message: 'Request failed with status code 503',
        response: {
          status: 503,
          data: { message: 'Service Unavailable' },
          config: { url: '/test', method: 'get' }
        },
        config: { url: '/test', method: 'get' }
      };
      
      // Mock axios request to simulate successful retry
      (api.axiosInstance.request as jest.Mock).mockResolvedValueOnce({ 
        data: { success: true } 
      });
      
      // Call the error handler with a server error
      const result = await errorHandler(serverError);
      
      // Should have attempted a retry
      expect(api.axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test',
          method: 'get',
          retryCount: 1
        })
      );
      
      // Should have resolved with the successful retry response
      expect(result).toEqual({ data: { success: true } });
    });
    
    it('should stop retrying after max retries', async () => {
      const serverError = {
        message: 'Request failed with status code 503',
        response: {
          status: 503,
          data: { message: 'Service Unavailable' },
          config: { url: '/test', method: 'get', retryCount: 2 } // Already at max retries
        },
        config: { url: '/test', method: 'get', retryCount: 2 }
      };
      
      try {
        // Call the error handler with a server error at max retries
        await errorHandler(serverError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect(error.status).toBe(503);
        expect(error.message).toBe('Service Unavailable');
      }
      
      // Should not have attempted another retry
      expect(api.axiosInstance.request).not.toHaveBeenCalled();
    });
  });
  
  describe('Prefetching', () => {
    let api: ReturnType<typeof createEnhancedApiClient>;
    
    beforeEach(() => {
      api = createEnhancedApiClient({
        enableCaching: false,
        enableDeduplication: false
      });
    });
    
    it('should prefetch data without throwing errors', async () => {
      // Mock a successful prefetch
      (api.axiosInstance.get as jest.Mock).mockResolvedValueOnce({ 
        data: { items: [1, 2, 3] } 
      });
      
      await api.prefetch('/entities');
      
      expect(api.axiosInstance.get).toHaveBeenCalledWith(
        '/entities', 
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
    
    it('should ignore errors during prefetch', async () => {
      // Mock a failed prefetch
      (api.axiosInstance.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      // Should not throw
      await api.prefetch('/entities');
      
      expect(api.axiosInstance.get).toHaveBeenCalled();
    });
  });
});