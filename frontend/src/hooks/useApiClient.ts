import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useCallback, useMemo } from 'react';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
}

interface ExtendedRequestConfig extends AxiosRequestConfig {
  requiresAuth?: boolean;
}

export const useApiClient = (config: ApiClientConfig = {}) => {
  const client: AxiosInstance = useMemo(() => {
    return axios.create({
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, [config.baseURL, config.timeout]);

  // Helper function to get the auth token and add it to request headers
  const addAuthHeader = useCallback((config: ExtendedRequestConfig) => {
    // Clone the config to avoid mutating the original
    const newConfig = { ...config };
    
    if (config.requiresAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        newConfig.headers = {
          ...newConfig.headers,
          'Authorization': `Bearer ${token}`
        };
        console.log('Added auth token to request headers');
      } else {
        console.warn('Auth token required but not found in localStorage');
      }
    }
    
    return newConfig;
  }, []);

  const get = useCallback(async <T = any>(url: string, config: ExtendedRequestConfig = {}) => {
    try {
      const configWithAuth = addAuthHeader(config);
      console.log(`Making GET request to ${url}`, { 
        hasAuth: !!configWithAuth.headers?.Authorization,
        requiresAuth: config.requiresAuth 
      });
      const response = await client.get<T>(url, configWithAuth);
      return response;
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  const post = useCallback(async <T = any>(url: string, data = {}, config: ExtendedRequestConfig = {}) => {
    try {
      const configWithAuth = addAuthHeader(config);
      console.log(`Making POST request to ${url}`, { 
        hasAuth: !!configWithAuth.headers?.Authorization,
        requiresAuth: config.requiresAuth,
        contentType: configWithAuth.headers?.['Content-Type']
      });
      
      // For FormData, make sure Content-Type is not set at all
      if (data instanceof FormData) {
        console.log('FormData detected, ensuring proper Content-Type header handling');
        // ALWAYS delete Content-Type header for FormData
        // This lets the browser set it automatically with boundary parameter
        if (configWithAuth.headers) {
          delete configWithAuth.headers['Content-Type'];
          console.log('Removed Content-Type header for FormData request');
        }
      }
      
      try {
        const response = await client.post<T>(url, data, configWithAuth);
        console.log(`POST response for ${url}:`, response.status, response.statusText);
        return response;
      } catch (axiosError: any) {
        console.error('POST request failed:', {
          url,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers,
        });
        throw axiosError;
      }
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  const put = useCallback(async <T = any>(url: string, data = {}, config: ExtendedRequestConfig = {}) => {
    try {
      const configWithAuth = addAuthHeader(config);
      console.log(`Making PUT request to ${url}`, { 
        hasAuth: !!configWithAuth.headers?.Authorization,
        requiresAuth: config.requiresAuth 
      });
      const response = await client.put<T>(url, data, configWithAuth);
      return response;
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  const del = useCallback(async <T = any>(url: string, config: ExtendedRequestConfig = {}) => {
    try {
      const configWithAuth = addAuthHeader(config);
      console.log(`Making DELETE request to ${url}`, { 
        hasAuth: !!configWithAuth.headers?.Authorization,
        requiresAuth: config.requiresAuth 
      });
      const response = await client.delete<T>(url, configWithAuth);
      return response;
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  return {
    client,
    get,
    post,
    put,
    delete: del,
  };
}; 