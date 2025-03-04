import axios, { AxiosInstance } from 'axios';
import { useCallback, useMemo } from 'react';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
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

  const get = useCallback(async (url: string, config = {}) => {
    try {
      const response = await client.get(url, config);
      return response;
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  }, [client]);

  const post = useCallback(async (url: string, data = {}, config = {}) => {
    try {
      const response = await client.post(url, data, config);
      return response;
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }, [client]);

  const put = useCallback(async (url: string, data = {}, config = {}) => {
    try {
      const response = await client.put(url, data, config);
      return response;
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  }, [client]);

  const del = useCallback(async (url: string, config = {}) => {
    try {
      const response = await client.delete(url, config);
      return response;
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  }, [client]);

  return {
    client,
    get,
    post,
    put,
    delete: del,
  };
}; 