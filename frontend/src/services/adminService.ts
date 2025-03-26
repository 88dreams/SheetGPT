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
  createBackup: (): Promise<{ success: boolean; message: string; backup_id: string; filename: string }> =>
    request('/db-management/backups', {
      method: 'POST',
      requiresAuth: true
    }),
    
  downloadBackup: (backupId: string): Promise<Blob> =>
    request(`/db-management/backups/${backupId}/download`, { 
      requiresAuth: true,
      responseType: 'blob'
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
    
  // Database maintenance endpoints
  cleanupDryRun: (): Promise<any> =>
    request('/db-management/cleanup/dry-run', { 
      requiresAuth: true 
    }),
    
  runCleanup: (): Promise<any> =>
    request('/db-management/cleanup', {
      method: 'POST',
      requiresAuth: true
    }),
    
  runVacuum: (options: { skipReindex?: boolean } = {}): Promise<any> =>
    request('/db-management/vacuum', {
      method: 'POST',
      body: JSON.stringify(options),
      requiresAuth: true
    }),
    
  getMaintenanceStatus: (): Promise<any> =>
    request('/db-management/maintenance/status', { 
      requiresAuth: true 
    }),
};

export default adminService;