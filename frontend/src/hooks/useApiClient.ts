import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useCallback, useMemo } from 'react';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
}

interface ExtendedRequestConfig extends AxiosRequestConfig {
  requiresAuth?: boolean;
}

interface StreamRequestConfig {
  requiresAuth?: boolean;
  headers?: Record<string, string>;
  onProgress?: (progress: any) => void;
  streamTimeout?: number; // Timeout in ms between chunks
}

export const useApiClient = (config: ApiClientConfig = {}) => {
  const client: AxiosInstance = useMemo(() => {
    return axios.create({
      baseURL: config.baseURL || '',
      timeout: config.timeout || 10000,
      // Default headers are set here, but we will override for FormData
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, [config.baseURL, config.timeout]);

  // Helper function to get the auth token and add it to request headers
  const addAuthHeader = useCallback((config: ExtendedRequestConfig): ExtendedRequestConfig => {
    // Clone the config to avoid mutating the original
    const newConfig: ExtendedRequestConfig = { ...config };
    
    if (config.requiresAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        newConfig.headers = {
          ...config.headers, // Use config.headers as the base
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
      const finalConfig = addAuthHeader(config);
      console.log(`Making GET request to ${url}`, { 
        hasAuth: !!finalConfig.headers?.Authorization,
        requiresAuth: config.requiresAuth 
      });
      const response = await client.get<T>(url, finalConfig);
      return response;
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  const post = useCallback(async <T = any>(url: string, data = {}, config: ExtendedRequestConfig = {}) => {
    try {
      const baseConfigWithAuth = addAuthHeader(config);
      let finalConfig = baseConfigWithAuth;

      if (data instanceof FormData) {
        console.log('FormData detected, explicitly setting Content-Type to multipart/form-data.');
        const formDataHeaders = { ...baseConfigWithAuth.headers };
        // Explicitly set Content-Type for FormData. Axios should handle the boundary.
        formDataHeaders['Content-Type'] = 'multipart/form-data'; 
        finalConfig = { ...baseConfigWithAuth, headers: formDataHeaders };
        // console.log('Content-Type header removed for FormData request.'); // Old log
      } else {
        // For non-FormData, ensure our default (or passed) Content-Type is set
        finalConfig = {
          ...baseConfigWithAuth,
          headers: {
            ...baseConfigWithAuth.headers,
            'Content-Type': baseConfigWithAuth.headers?.['Content-Type'] || 'application/json',
          }
        };
      }
      
      console.log(`Making POST request to ${url}`, { 
        hasAuth: !!finalConfig.headers?.Authorization,
        requiresAuth: config.requiresAuth,
        contentType: finalConfig.headers?.['Content-Type']
      });
      
      try {
        const response = await client.post<T>(url, data, finalConfig);
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
      // Similar logic for PUT if it also needs to handle FormData, but typically not.
      // For now, assume JSON unless FormData is explicitly handled like in POST.
      const finalConfig = addAuthHeader({
        ...config,
        headers: {
            ...config.headers,
            'Content-Type': config.headers?.['Content-Type'] || 'application/json',
        }
      });

      console.log(`Making PUT request to ${url}`, { 
        hasAuth: !!finalConfig.headers?.Authorization,
        requiresAuth: config.requiresAuth 
      });
      const response = await client.put<T>(url, data, finalConfig);
      return response;
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  const del = useCallback(async <T = any>(url: string, config: ExtendedRequestConfig = {}) => {
    try {
      const finalConfig = addAuthHeader(config);
      console.log(`Making DELETE request to ${url}`, { 
        hasAuth: !!finalConfig.headers?.Authorization,
        requiresAuth: config.requiresAuth 
      });
      const response = await client.delete<T>(url, finalConfig);
      return response;
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  }, [client, addAuthHeader]);

  const postStreaming = useCallback(async <T = any>(
    url: string, 
    data: any, 
    config: StreamRequestConfig = {}
  ): Promise<T> => {
    const { requiresAuth = true, onProgress, streamTimeout = 30000 } = config;
    
    const requestHeaders: Record<string, string> = {
      ...config.headers,
    };

    if (requiresAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Determine body and content type
    let body;
    if (data instanceof FormData) {
      body = data;
      // Let the browser set the Content-Type for FormData
    } else {
      body = JSON.stringify(data);
      requestHeaders['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const signal = controller.signal;

    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.error(`Stream timed out after ${streamTimeout}ms of inactivity.`);
        controller.abort();
      }, streamTimeout);
    };

    try {
      resetTimeout(); // Start the initial timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: body,
        signal: signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Network response was not ok');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: any;

      while (true) {
        resetTimeout(); // Reset timeout on each new chunk
        const { done, value } = await reader.read();
        if (done) {
          clearTimeout(timeoutId);
          if (buffer.trim()) {
            // Process any remaining data in the buffer
            try {
              finalData = JSON.parse(buffer);
              if (onProgress) {
                onProgress(finalData);
              }
            } catch (e) {
               console.error('Error parsing final JSON chunk:', e, 'Buffer:', buffer);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process buffer line-by-line for streaming JSON
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            try {
              const progressData = JSON.parse(line);
              if (onProgress) {
                onProgress(progressData);
              }
              finalData = progressData; // Store the latest complete chunk
            } catch (e) {
              console.warn('Error parsing stream chunk:', e, 'Line:', line);
            }
          }
        }
      }

      return finalData;

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API Streaming POST Error:', error);
      throw error;
    }
  }, []);

  return {
    client,
    get,
    post,
    put,
    delete: del,
    postStreaming,
  };
}; 