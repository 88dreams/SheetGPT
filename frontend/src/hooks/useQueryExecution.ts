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
    url?: string;  // For Sheets or CSV backend URL
    error?: string;
  };
  message?: string; // General message from backend
}

// Define the return type of the hook
export interface UseQueryExecutionReturn {
  mutation: UseMutationResult<QueryResponse, Error, QueryData>;
  executedQueryResults: any[];
  setExecutedQueryResults: React.Dispatch<React.SetStateAction<any[]>>;
  executionValidationError: string | null;
  setExecutionValidationError: React.Dispatch<React.SetStateAction<string | null>>;
  executionSuggestedSql: string | null;
  setExecutionSuggestedSql: React.Dispatch<React.SetStateAction<string | null>>;
  executionGeneratedSql: string | null;
  setExecutionGeneratedSql: React.Dispatch<React.SetStateAction<string | null>>;
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
};

// Prop type to allow the hook to update generated SQL in the parent component/hook
interface UseQueryExecutionProps {
  initialQueryName?: string;
  // This might be needed if the hook itself shouldn't directly call window.open
  // or if the component needs to perform actions like closing a dialog.
  // For now, trying to keep it simple.
  // onSheetsExportSuccess?: (url: string) => void; 
}

export const useQueryExecution = (props: UseQueryExecutionProps = {}): UseQueryExecutionReturn => {
  const { initialQueryName } = props;
  const { showNotification } = useNotification();
  const queryClient = useQueryClient(); // Needed for potential cache invalidation if required

  const [executedQueryResults, setExecutedQueryResults] = useState<any[]>([]);
  const [executionValidationError, setExecutionValidationError] = useState<string | null>(null);
  const [executionSuggestedSql, setExecutionSuggestedSql] = useState<string | null>(null);
  const [executionGeneratedSql, setExecutionGeneratedSql] = useState<string | null>(null);


  const queryMutation = useMutation<QueryResponse, Error, QueryData>(
    {
      mutationFn: async (queryData: QueryData) => {
        const isValidToken = await ensureValidToken();
        if (!isValidToken) {
          // Notification will be handled in onError
          throw new Error('Authentication failed. Please log in again.');
        }
        const token = getToken();
        // Ensure Content-Type is set for POST requests with a body
        const response = await apiClient.post('/db-management/query', queryData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
        return response.data;
      },
      onSuccess: (data, variables) => {
        console.log('Query mutation succeeded:', data, 'Variables:', variables);

        if (data.success === false && data.validation_error) {
          setExecutionValidationError(data.validation_error);
          setExecutionSuggestedSql(data.suggested_sql || null);
          setExecutedQueryResults([]); // Clear previous results on validation error
          setExecutionGeneratedSql(null); // Clear previous generated SQL
          showNotification('warning', data.suggested_sql ? 'SQL validation issues found. Apply fix or edit SQL.' : 'SQL validation issues found.');
        } else if (data.success === true) {
          setExecutionValidationError(null);
          setExecutionSuggestedSql(null);
          setExecutedQueryResults(data.results || []);
          
          if (data.generated_sql) {
            setExecutionGeneratedSql(data.generated_sql);
          } else {
            // If backend didn't return a new SQL, preserve the one from variables if it was SQL execution
            if (!variables.natural_language) {
              setExecutionGeneratedSql(variables.query);
            } else {
              setExecutionGeneratedSql(null); // Clear if it was NLQ and no SQL returned
            }
          }

          // Handle exports
          if (variables.export_format === 'csv' && data.export?.format === 'csv') {
            if (data.export.data) { // Direct data blob for client-side save
              try {
                const blob = new Blob([data.export.data], { type: 'text/csv;charset=utf-8;' });
                const filename = variables.queryName || initialQueryName || 'query_results';
                const fullFilename = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

                if ('showSaveFilePicker' in window) {
                  window.showSaveFilePicker({
                    suggestedName: fullFilename,
                    types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] }}]
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
            } else if (data.export.url) { // URL for backend-generated CSV
                window.open(data.export.url, '_blank');
                showNotification('success', 'CSV download link ready (via backend).');
            }
          } else if (variables.export_format === 'sheets' && data.export?.format === 'sheets') {
            if (data.export.error) {
              showNotification('error', `Sheets export error: ${data.export.error}`);
            } else if (data.export.url) {
              window.open(data.export.url, '_blank');
              showNotification('success', 'Successfully exported to Google Sheets via backend.');
              // If a callback was provided for post-sheets-export actions:
              // if (props.onSheetsExportSuccess) props.onSheetsExportSuccess(data.export.url);
            }
          }
        } else if (data.message) { // Handle general success messages if any
            showNotification('info', data.message);
        }
      },
      onError: (error: Error) => {
        console.error('Query mutation failed:', error);
        let errorMessage = error.message || 'Unknown error executing query';
        
        // Attempt to parse Axios error structure
        // Type assertion for error with response property
        const axiosError = error as Error & { response?: { status: number; data?: { detail?: string; message?: string } } };

        if (axiosError.response) {
          if (axiosError.response.status === 401) {
            errorMessage = 'Authentication error: Please log in again.';
          } else {
            errorMessage = axiosError.response.data?.detail || axiosError.response.data?.message || errorMessage;
          }
        }
        
        showNotification('error', `Error executing query: ${errorMessage}`);
        setExecutedQueryResults([]); // Clear results on error
        setExecutionValidationError(null); // Clear validation context
        setExecutionSuggestedSql(null);
        setExecutionGeneratedSql(null); // Clear generated SQL
      },
    }
  );

  return {
    mutation: queryMutation,
    executedQueryResults,
    setExecutedQueryResults,
    executionValidationError,
    setExecutionValidationError,
    executionSuggestedSql,
    setExecutionSuggestedSql,
    executionGeneratedSql,
    setExecutionGeneratedSql,
  };
};

export default useQueryExecution; 