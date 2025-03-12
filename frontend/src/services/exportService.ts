import { request, RequestOptions, APIError } from '../utils/apiClient';

export const exportService = {
  // Authentication endpoints
  getAuthUrl: (): Promise<{ url: string }> =>
    request('/export/auth/google', { requiresAuth: true }),

  getAuthStatus: (): Promise<{ authenticated: boolean }> =>
    request('/export/auth/status', { requiresAuth: true }),

  // Template endpoints
  getTemplates: (): Promise<string[]> => {
    console.log('API: Fetching export templates');
    return request('/export/templates', { requiresAuth: true });
  },

  // Preview endpoint
  getExportPreview: (dataId: string, templateName: string): Promise<{
    columns: string[];
    sampleData: any[][];
  }> => {
    console.log('API: Fetching export preview for dataId:', dataId, 'template:', templateName);
    return request(`/export/preview/${dataId}?template=${templateName}`, { requiresAuth: true });
  },

  // Export endpoints
  exportToSheets: (dataId: string, templateName: string, title?: string): Promise<any> => {
    console.log('API: Exporting to sheets with dataId:', dataId, 'template:', templateName, 'title:', title);
    // Use a longer timeout for this operation as it can take time due to Google Sheets API
    const options: RequestOptions = {
      method: 'POST',
      body: JSON.stringify({
        data_id: dataId,
        template_name: templateName,
        title: title || `Exported Data - ${new Date().toLocaleDateString()}`
      }),
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Export-Operation': 'true' // Custom header to indicate this is an export operation
      },
      // Add a longer timeout for export operations
      timeout: 60000 // 60 seconds
    };
    
    return request('/export/sheets', options).catch(error => {
      console.log('Export to Sheets error:', error);
      // Provide a more helpful error message
      if (error.message?.includes('timeout')) {
        throw new APIError(
          'The export operation is taking longer than expected. Please check the exports page in a few minutes to see if it completed.',
          408
        );
      }
      // Google Sheets API error
      if (error.status === 500 && error.message?.includes('Google Sheets')) {
        throw new APIError(
          'There was an issue with the Google Sheets API. Please make sure you have authenticated with Google Sheets and have permission to create spreadsheets.',
          500
        );
      }
      // Pass through the original error
      throw error;
    });
  },

  applyTemplate: (spreadsheetId: string, templateName: string): Promise<any> => {
    console.log('API: Applying template to spreadsheet:', spreadsheetId, 'template:', templateName);
    return request(`/export/sheets/${spreadsheetId}/template`, {
      method: 'POST',
      body: JSON.stringify({
        template_name: templateName
      }),
      requiresAuth: true
    });
  }
};

export default exportService;