import { request } from '../utils/apiClient';

export const adminService = {
  cleanDatabase: (): Promise<{ message: string; details: string }> =>
    request('/admin/clean-database', {
      method: 'POST',
      requiresAuth: true
    }),
  
  // Database management endpoints
  getStatistics: (): Promise<any> =>
    request('/db-management/stats', { requiresAuth: true }),
    
  // Backup management
  createBackup: (): Promise<{ success: boolean; message: string }> =>
    request('/db-management/backups', {
      method: 'POST',
      requiresAuth: true
    }),
    
  listBackups: (): Promise<any[]> =>
    request('/db-management/backups', { requiresAuth: true }),
    
  // Conversation archiving
  archiveConversation: (conversationId: string): Promise<{ success: boolean; message: string }> =>
    request(`/db-management/conversations/${conversationId}/archive`, {
      method: 'POST',
      requiresAuth: true
    }),
    
  restoreConversation: (conversationId: string): Promise<{ success: boolean; message: string }> =>
    request(`/db-management/conversations/${conversationId}/restore`, {
      method: 'POST',
      requiresAuth: true
    }),
};

export default adminService;