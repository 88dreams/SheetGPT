import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import LoadingSpinner from '../common/LoadingSpinner'
import { api } from '../../utils/api'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  dataId: string
}

interface ExportPreview {
  columns: string[]
  sampleData: any[][]
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, dataId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default')
  const [spreadsheetName, setSpreadsheetName] = useState<string>('')
  const { showNotification } = useNotification()
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

  // Fetch available templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['export-templates'],
    queryFn: () => api.export.getTemplates(),
    onError: () => {
      showNotification('error', 'Failed to fetch templates')
    }
  })

  // Check Google Sheets auth status
  const { data: authData } = useQuery({
    queryKey: ['sheets-auth-status'],
    queryFn: () => api.export.getAuthStatus(),
    onError: () => {
      setAuthStatus('unauthenticated')
    }
  })

  // Update auth status when authData changes
  useEffect(() => {
    if (authData) {
      setAuthStatus(authData.authenticated ? 'authenticated' : 'unauthenticated')
    }
  }, [authData])

  // Get export preview - doesn't require auth for CSV export
  const { data: preview, isLoading: isLoadingPreview } = useQuery<ExportPreview>({
    queryKey: ['export-preview', dataId, selectedTemplate],
    queryFn: async () => {
      try {
        return await api.export.getExportPreview(dataId, selectedTemplate)
      } catch (error) {
        console.error('Error fetching preview:', error)
        showNotification('error', 'Failed to get export preview')
        throw error
      }
    },
    enabled: !!dataId && !!selectedTemplate
  })

  // Get structured data details to suggest a spreadsheet name
  const { data: structuredData } = useQuery({
    queryKey: ['structured-data', dataId],
    queryFn: () => api.data.getStructuredDataById(dataId),
    enabled: !!dataId
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

  // Handle Google Sheets authentication
  const handleAuth = async () => {
    try {
      const { url } = await api.export.getAuthUrl()
      window.location.href = url
    } catch (error) {
      showNotification('error', 'Failed to initiate Google Sheets authentication')
    }
  }

  // Export to Google Sheets mutation
  const exportMutation = useMutation({
    mutationFn: () => api.export.exportToSheets(dataId, selectedTemplate, spreadsheetName),
    onSuccess: (data) => {
      showNotification('success', 'Data exported successfully')
      if (data?.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank')
      }
      onClose()
    },
    onError: (error: any) => {
      console.error('Export error:', error)
      showNotification('error', 'Failed to export to Google Sheets. Try CSV export instead.')
    }
  })

  // Generate and download CSV
  const handleCsvExport = () => {
    if (!preview || !preview.columns || !preview.sampleData) {
      showNotification('error', 'No data available for export')
      return
    }

    try {
      // Generate CSV content from the data
      const generateCSV = (columns: string[], rows: any[][]) => {
        // Create header row
        let csvContent = columns.join(',') + '\n'
        
        // Add data rows
        rows.forEach(row => {
          const formattedRow = row.map(cell => {
            // Format the cell for CSV
            const value = (cell === null || cell === undefined) ? '' : String(cell)
            // Escape quotes and wrap in quotes if it contains commas or quotes
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          csvContent += formattedRow.join(',') + '\n'
        })
        
        return csvContent
      }
      
      // Generate CSV using the preview data
      // Use all data, not just the sample data shown in preview
      const allData = preview.sampleData.length > 5 ? preview.sampleData : 
                     (structuredData?.data?.rows || []).map(row => {
                        if (Array.isArray(row)) return row;
                        // Convert dict to array in same order as columns
                        return preview.columns.map(col => row[col] || '');
                     });
                     
      const csvContent = generateCSV(
        preview.columns,
        allData
      )
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${spreadsheetName || 'export'}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showNotification('success', 'CSV file downloaded successfully')
    } catch (e) {
      console.error('Error generating CSV:', e)
      showNotification('error', 'Failed to generate CSV file')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Data Preview */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Data Preview
          </h3>
          {isLoadingPreview ? (
            <LoadingSpinner size="small" />
          ) : preview && preview.columns && preview.columns.length > 0 ? (
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
              {preview ? 'No column data available for preview' : 'Preview not available. Please ensure data is available.'}
            </div>
          )}
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Export Options
          </h3>

          {/* CSV Export */}
          <div className="mb-4">
            <button
              onClick={handleCsvExport}
              disabled={!preview || !preview.columns || !preview.sampleData}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download as CSV
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Direct download as CSV file. Works without Google Sheets authentication.
            </p>
          </div>

          {/* Google Sheets Export */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Google Sheets Export
              </h3>

              {/* Authentication Status */}
              {authStatus === 'checking' ? (
                <div className="flex items-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Checking authentication...</span>
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
                {/* Template Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
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

                {/* Spreadsheet Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spreadsheet Name
                  </label>
                  <input
                    type="text"
                    value={spreadsheetName}
                    onChange={(e) => setSpreadsheetName(e.target.value)}
                    placeholder="Enter spreadsheet name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Export Button */}
                <button
                  onClick={() => exportMutation.mutate()}
                  disabled={
                    exportMutation.isPending ||
                    !selectedTemplate ||
                    !spreadsheetName
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {exportMutation.isPending ? (
                    <>
                      <LoadingSpinner size="small" className="text-white" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    'Export to Google Sheets'
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog