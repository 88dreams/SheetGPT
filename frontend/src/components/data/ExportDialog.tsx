import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import LoadingSpinner from '../common/LoadingSpinner'
import { api } from '../../utils/api'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  dataId: string
}

interface Template {
  name: string
  header: Record<string, any>
  body: Record<string, any>
  alternateRow?: Record<string, any>
}

interface ExportPreview {
  columns: string[]
  sampleData: any[][]
}

interface AuthStatus {
  authenticated: boolean
}

interface ExistingSpreadsheet {
  id: string
  name: string
  lastModified: string
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, dataId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default')
  const [spreadsheetName, setSpreadsheetName] = useState<string>('')
  const [exportMode, setExportMode] = useState<'new' | 'existing'>('new')
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('')
  const [includeRelationships, setIncludeRelationships] = useState(false)
  const { showNotification } = useNotification()
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

  // Fetch available templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<string[]>({
    queryKey: ['export-templates'],
    queryFn: () => api.export.getTemplates(),
    onError: () => {
      showNotification('error', 'Failed to fetch templates')
    }
  } as UseQueryOptions<string[]>)

  // Check Google Sheets auth status
  const { data: authData } = useQuery<AuthStatus>({
    queryKey: ['sheets-auth-status'],
    queryFn: () => api.export.getAuthStatus(),
    onError: () => {
      setAuthStatus('unauthenticated')
    }
  } as UseQueryOptions<AuthStatus>)

  // Update auth status when authData changes
  useEffect(() => {
    if (authData) {
      setAuthStatus(authData.authenticated ? 'authenticated' : 'unauthenticated')
    }
  }, [authData])

  // Get export preview
  const { data: preview, isLoading: isLoadingPreview } = useQuery<ExportPreview>({
    queryKey: ['export-preview', dataId, selectedTemplate],
    queryFn: async () => {
      console.log('ExportDialog: Fetching preview for dataId:', dataId, 'template:', selectedTemplate);
      try {
        const result = await api.export.getExportPreview(dataId, selectedTemplate);
        console.log('ExportDialog: Preview result:', result);
        return result;
      } catch (error) {
        console.error('ExportDialog: Error fetching preview:', error);
        showNotification('error', 'Failed to get export preview');
        throw error;
      }
    },
    enabled: !!dataId && !!selectedTemplate && authStatus === 'authenticated',
    onError: (error) => {
      console.error('ExportDialog: Preview query error:', error);
      showNotification('error', 'Failed to get export preview');
    }
  } as UseQueryOptions<ExportPreview>)

  // Get structured data details to suggest a spreadsheet name
  const { data: structuredData } = useQuery({
    queryKey: ['structured-data', dataId],
    queryFn: async () => {
      console.log('ExportDialog: Fetching structured data for dataId:', dataId);
      try {
        const result = await api.data.getStructuredDataById(dataId);
        console.log('ExportDialog: Structured data result:', {
          id: result.id,
          data_type: result.data_type,
          meta_data: result.meta_data,
          data_keys: result.data ? Object.keys(result.data) : [],
          has_rows: result.data?.rows ? true : false,
          rows_length: result.data?.rows ? result.data.rows.length : 0
        });
        return result;
      } catch (error) {
        console.error('ExportDialog: Error fetching structured data:', error);
        throw error;
      }
    },
    enabled: !!dataId && authStatus === 'authenticated'
  })

  // Set default spreadsheet name when structured data is loaded
  useEffect(() => {
    if (structuredData) {
      const defaultName = structuredData?.meta_data?.conversation_title || 
                          structuredData?.meta_data?.name || 
                          `Exported Data - ${new Date().toLocaleDateString()}`
      setSpreadsheetName(defaultName)
    }
  }, [structuredData])

  // Mock data for existing spreadsheets - in a real implementation, this would be fetched from the API
  const mockSpreadsheets: ExistingSpreadsheet[] = [
    { id: 'sheet1', name: 'My Spreadsheet 1', lastModified: '2024-04-01' },
    { id: 'sheet2', name: 'Data Analysis', lastModified: '2024-04-02' },
    { id: 'sheet3', name: 'Project Metrics', lastModified: '2024-04-03' }
  ]

  // Handle Google Sheets authentication
  const handleAuth = async () => {
    try {
      const { url } = await api.export.getAuthUrl()
      window.location.href = url
    } catch (error) {
      showNotification('error', 'Failed to initiate Google Sheets authentication')
    }
  }

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      console.log('ExportDialog: Starting export process');
      console.log('ExportDialog: Export mode:', exportMode);
      console.log('ExportDialog: Selected template:', selectedTemplate);
      console.log('ExportDialog: Data ID:', dataId);
      
      try {
        let result;
        if (exportMode === 'new') {
          console.log('ExportDialog: Creating new spreadsheet with name:', spreadsheetName);
          result = await api.export.exportToSheets(dataId, selectedTemplate, spreadsheetName);
        } else {
          console.log('ExportDialog: Applying template to existing spreadsheet:', selectedSpreadsheetId);
          result = await api.export.applyTemplate(selectedSpreadsheetId, selectedTemplate);
        }
        
        console.log('ExportDialog: Export result:', result);
        return result;
      } catch (error) {
        console.error('ExportDialog: Export error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('ExportDialog: Export successful:', data);
      showNotification('success', 'Data exported successfully');
      // If we have a spreadsheet URL, open it in a new tab
      if (data?.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank');
      }
      onClose();
    },
    onError: (error) => {
      console.error('ExportDialog: Export mutation error:', error);
      showNotification('error', 'Failed to export data');
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export to Google Sheets</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Authentication Status */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Google Sheets Connection
          </h3>
          {authStatus === 'checking' ? (
            <div className="flex items-center">
              <LoadingSpinner size="small" />
              <span className="ml-2">Checking authentication status...</span>
            </div>
          ) : authStatus === 'authenticated' ? (
            <div className="flex items-center text-green-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected to Google Sheets
            </div>
          ) : (
            <button
              onClick={handleAuth}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect to Google Sheets
            </button>
          )}
        </div>

        {authStatus === 'authenticated' && (
          <>
            {/* Export Mode Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Export Mode
              </h3>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportMode"
                    value="new"
                    checked={exportMode === 'new'}
                    onChange={() => setExportMode('new')}
                    className="mr-2"
                  />
                  Create New Spreadsheet
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportMode"
                    value="existing"
                    checked={exportMode === 'existing'}
                    onChange={() => setExportMode('existing')}
                    className="mr-2"
                  />
                  Update Existing Spreadsheet
                </label>
              </div>
            </div>

            {/* Spreadsheet Name (for new spreadsheets) */}
            {exportMode === 'new' && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Spreadsheet Name
                </h3>
                <input
                  type="text"
                  value={spreadsheetName}
                  onChange={(e) => setSpreadsheetName(e.target.value)}
                  placeholder="Enter spreadsheet name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Existing Spreadsheet Selection */}
            {exportMode === 'existing' && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Select Spreadsheet
                </h3>
                <select
                  value={selectedSpreadsheetId}
                  onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a spreadsheet</option>
                  {mockSpreadsheets.map(sheet => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name} (Last modified: {sheet.lastModified})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Template Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Select Template
              </h3>
              {isLoadingTemplates ? (
                <LoadingSpinner size="small" />
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {templates?.map(template => (
                    <option key={template} value={template}>
                      {template}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Add relationship option */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Export Options
              </h3>
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeRelationships}
                  onChange={(e) => setIncludeRelationships(e.target.checked)}
                  className="mr-2"
                />
                Include relationships in export
              </label>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Preview
              </h3>
              {isLoadingPreview ? (
                <LoadingSpinner size="small" />
              ) : preview && preview.columns.length > 0 ? (
                <div className="max-h-64 overflow-auto border rounded">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.columns.map((column, i) => (
                          <th
                            key={i}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.sampleData.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 p-4 border rounded">
                  {preview ? 'No data available for preview' : 'Preview not available. Please select a template and ensure data is available.'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={
              authStatus !== 'authenticated' ||
              exportMutation.isPending ||
              !selectedTemplate ||
              (exportMode === 'new' && !spreadsheetName) ||
              (exportMode === 'existing' && !selectedSpreadsheetId)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {exportMutation.isPending ? (
              <>
                <LoadingSpinner size="small" className="text-white" />
                <span>Exporting...</span>
              </>
            ) : (
              'Export'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog 