import { request, setToken, removeToken } from '../utils/apiClient';
import { TokenResponse, User } from '../types/api';

export const authService = {
  register: (data: { email: string; password: string }): Promise<User> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  login: async (data: { email: string; password: string }): Promise<TokenResponse> => {
    console.log('Auth service login: starting request with increased timeout');
    try {
      // Increase timeout for login request to 30 seconds
      const response = await request<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      console.log('Auth service login: request succeeded');
      setToken(response.access_token);
      return response;
    } catch (error) {
      console.error('Auth service login: request failed', error);
      throw error;
    }
  },

  logout: (): Promise<void> => {
    removeToken()
    return Promise.resolve()
  },

  me: (): Promise<User> =>
    request('/auth/me', { requiresAuth: true })
};

export default authService;