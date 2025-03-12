import { request } from '../utils/apiClient';
import { RowData, RowsResponse } from '../types/api';
import { StructuredData, Column } from '../types/data';

export const dataService = {
  getStructuredData: (): Promise<StructuredData[]> =>
    request('/data', { requiresAuth: true }),

  getStructuredDataById: (id: string): Promise<StructuredData> =>
    request(`/data/${id}`, { requiresAuth: true }),

  getStructuredDataByMessageId: (messageId: string): Promise<StructuredData> =>
    request(`/data/by-message/${messageId}`, { requiresAuth: true }),
    
  createStructuredData: (data: Partial<StructuredData>): Promise<StructuredData> =>
    request('/data', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteStructuredData: (id: string): Promise<void> =>
    request(`/data/${id}`, { 
      method: 'DELETE',
      requiresAuth: true 
    }),
    
  updateStructuredData: (id: string, updates: Partial<StructuredData>): Promise<StructuredData> =>
    request(`/data/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      requiresAuth: true
    }),

  getColumns: (dataId: string): Promise<Column[]> =>
    request(`/data/${dataId}/columns`, { requiresAuth: true }),

  updateColumn: (dataId: string, columnName: string, updates: Partial<Column>): Promise<Column> =>
    request(`/data/${dataId}/columns/${columnName}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      requiresAuth: true
    }),

  getRows: (dataId: string, skip: number = 0, limit: number = 50): Promise<RowsResponse> =>
    request(`/data/${dataId}/rows?skip=${skip}&limit=${limit}`, { requiresAuth: true }),

  updateCell: (dataId: string, update: { column_name: string; row_index: number; value: any }): Promise<any> =>
    request(`/data/${dataId}/cells`, {
      method: 'PUT',
      body: JSON.stringify(update),
      requiresAuth: true
    }),

  addRow: (dataId: string, rowData: Record<string, any>): Promise<any> =>
    request(`/data/${dataId}/rows`, {
      method: 'POST',
      body: JSON.stringify(rowData),
      requiresAuth: true
    }),

  deleteRow: (dataId: string, rowIndex: number): Promise<void> =>
    request(`/data/${dataId}/rows/${rowIndex}`, {
      method: 'DELETE',
      requiresAuth: true
    }),

  updateRow: (dataId: string, rowIndex: number, rowData: Record<string, any>): Promise<any> =>
    request(`/data/${dataId}/rows/${rowIndex}`, {
      method: 'PUT',
      body: JSON.stringify(rowData),
      requiresAuth: true
    })
};

export default dataService;