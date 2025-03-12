import { request, setToken, removeToken } from '../utils/apiClient';
import { TokenResponse, User } from '../types/api';

export const authService = {
  register: (data: { email: string; password: string }): Promise<User> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  login: async (data: { email: string; password: string }): Promise<TokenResponse> => {
    const response = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    setToken(response.access_token)
    return response
  },

  logout: (): Promise<void> => {
    removeToken()
    return Promise.resolve()
  },

  me: (): Promise<User> =>
    request('/auth/me', { requiresAuth: true })
};

export default authService;