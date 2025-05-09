import { useState } from 'react';
import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient, getToken } from '../utils/apiClient';
import { ensureValidToken } from '../utils/tokenRefresh';

// Define the type for the query data passed to the mutation
export interface QueryData {
  query: string;
  natural_language: boolean;
  export_format?: string;
  sheet_title?: string;
  queryName?: string;
}

// Define the expected success response structure (adjust based on actual API)
export interface QueryResponse {
  success: boolean;
  results?: any[];
  generated_sql?: string;
  validation_error?: string;
  suggested_sql?: string;
  export?: {
    format: string;
    data?: string; // For CSV
    url?: string;  // For Sheets
    error?: string;
  };
}

// Define the return type of the hook
export interface UseQueryExecutionReturn {
  mutation: UseMutationResult<QueryResponse, Error, QueryData>;
}

// Helper function for CSV download fallback
const fallbackDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.setAttribute('download', filename);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
  // Note: Notification for fallback success will be handled in onSuccess now
};

export const useQueryExecution = (initialQueryName?: string): UseQueryExecutionReturn => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient(); // Needed for potential cache invalidation if required

  const queryMutation = useMutation<QueryResponse, Error, QueryData>(
    {
      mutationFn: async (queryData: QueryData) => {
        const isValidToken = await ensureValidToken();
        if (!isValidToken) {
          throw new Error('Authentication failed. Please log in again.');
        }
        const token = getToken();
        const response = await apiClient.post('/db-management/query', queryData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data;
      },
      // onSuccess and onError are now primarily handled by the component watching mutation state
      // We can still log or do minimal side effects here if needed.
      onSuccess: (data, variables) => {
        console.log('Query mutation succeeded:', data, 'Variables:', variables);
        // Trigger CSV download directly if this mutation was for CSV export
        if (variables.export_format === 'csv' && data.export?.format === 'csv' && data.export.data) {
          try {
            const blob = new Blob([data.export.data], { type: 'text/csv;charset=utf-8;' });
            // Use queryName from variables if provided, else default
            const filename = variables.queryName || initialQueryName || 'query_results';
            const fullFilename = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

            if ('showSaveFilePicker' in window) {
              window.showSaveFilePicker({
                suggestedName: fullFilename,
                types: [{
                  description: 'CSV Files',
                  accept: { 'text/csv': ['.csv'] }
                }]
              }).then(async (fileHandle) => {
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                showNotification('success', 'CSV file saved successfully');
              }).catch(err => {
                if ((err as Error).name !== 'AbortError') {
                  console.error('Error using File System Access API, falling back:', err);
                  fallbackDownload(blob, fullFilename);
                  showNotification('success', 'CSV downloaded successfully (fallback method).');
                }
              });
            } else {
              fallbackDownload(blob, fullFilename);
              showNotification('success', 'CSV downloaded successfully (fallback method).');
            }
          } catch (error) {
            console.error('Error processing CSV data for download:', error);
            showNotification('error', 'Failed to process CSV data for download.');
          }
        }
      },
      onError: (error: Error) => {
        console.error('Query mutation failed:', error);
        // Component will handle UI notifications based on mutation.error
      },
      // onSettled: () => {
        // No longer needed as isLoading comes from mutation state
      // }
    }
  );

  return {
    mutation: queryMutation, // Return the whole mutation object
  };
};

export default useQueryExecution; 