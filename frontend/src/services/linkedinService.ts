import { apiClient } from '../utils/apiClient';

// Define types
export interface LinkedInStatusResponse {
  is_connected: boolean;
  profile_name?: string;
  connection_count?: number;
  last_synced?: string;
}

export interface BrandConnection {
  brand_id: string;
  brand_name: string;
  industry?: string;
  company_type?: string;
  first_degree_count: number;
  second_degree_count: number;
  total_connections: number;
}

// LinkedIn API service
const linkedinService = {
  getStatus: async (): Promise<LinkedInStatusResponse> => {
    try {
      const response = await apiClient.get('/v1/linkedin/status');
      return response.data;
    } catch (error) {
      console.log('LinkedIn getStatus error:', error);
      // For any error, return not connected
      if (error.response) {
        console.log('Status code:', error.response.status);
        console.log('Response data:', error.response.data);
      }
      // Return not connected for any error
      return { is_connected: false };
    }
  },
  
  disconnect: async () => {
    try {
      const response = await apiClient.delete('/v1/linkedin/disconnect');
      return response.data;
    } catch (error) {
      console.error('LinkedIn disconnect error:', error);
      throw error;
    }
  },
  
  sync: async () => {
    try {
      const response = await apiClient.post('/v1/linkedin/sync');
      return response.data;
    } catch (error) {
      console.error('LinkedIn sync error:', error);
      throw error;
    }
  },
  
  getBrandConnections: async (minConnections: number = 0) => {
    try {
      const response = await apiClient.get('/v1/linkedin/connections/brands', {
        params: { min_connections: minConnections }
      });
      return response.data as BrandConnection[];
    } catch (error) {
      console.error('LinkedIn getBrandConnections error:', error);
      // Return empty array on error
      return [];
    }
  },
  
  getBrandConnection: async (brandId: string): Promise<BrandConnection | null> => {
    try {
      const response = await apiClient.get(`/v1/linkedin/connections/brands/${brandId}`);
      return response.data;
    } catch (error) {
      console.error(`LinkedIn getBrandConnection error for brand ${brandId}:`, error);
      // Return null on error
      return null;
    }
  }
};

export default linkedinService;