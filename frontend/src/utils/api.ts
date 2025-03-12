// api.ts - API client facade for the application

// Import types
import { APIError, RequestOptions } from './apiClient';
import { TokenResponse, User, Conversation, Message, PaginatedResponse } from '../types/api';

// Import individual service modules
import authService from '../services/authService';
import chatService from '../services/chatService';
import dataService from '../services/dataService';
import exportService from '../services/exportService';
import sportsService from '../services/sportsService';
import adminService from '../services/adminService';

// Re-export types that consumers might need
export { APIError } from './apiClient';
export type { RequestOptions } from './apiClient';
export type { 
  TokenResponse, User, PaginatedResponse, 
  Conversation, Message, RowData, RowsResponse 
} from '../types/api';

// Create and export the unified API object
export const api = {
  auth: authService,
  chat: chatService,
  data: dataService,
  export: exportService,
  sports: sportsService,
  admin: adminService,
  dbManagement: adminService, // For backward compatibility
};

export default api; 