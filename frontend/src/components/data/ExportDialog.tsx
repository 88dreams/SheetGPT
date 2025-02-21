import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import LoadingSpinner from '../common/LoadingSpinner'

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

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, dataId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default')
  const { showNotification } = useNotification()
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

  // Fetch available templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<string[]>({
    queryKey: ['export-templates'],
    queryFn: async () => {
      const response = await fetch('/api/v1/export/templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      return response.json()
    }
  })

  // Check Google Sheets auth status
  const { data: authData } = useQuery<AuthStatus>({
    queryKey: ['sheets-auth-status'],
    queryFn: async () => {
      const response = await fetch('/api/v1/export/auth/status')
      if (!response.ok) throw new Error('Failed to check auth status')
      return response.json()
    }
  })

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
      const response = await fetch(`/api/v1/export/preview/${dataId}?template=${selectedTemplate}`)
      if (!response.ok) throw new Error('Failed to get export preview')
      return response.json()
    },
    enabled: !!dataId && !!selectedTemplate
  })

  // Handle Google Sheets authentication
  const handleAuth = async () => {
    try {
      const response = await fetch('/api/v1/export/auth/google')
      if (!response.ok) throw new Error('Failed to initiate authentication')
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      showNotification('error', 'Failed to initiate Google Sheets authentication')
    }
  }

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/export/sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data_id: dataId,
          template_name: selectedTemplate
        })
      })
      if (!response.ok) throw new Error('Failed to export data')
      return response.json()
    },
    onSuccess: (data) => {
      showNotification('success', 'Data exported successfully')
      onClose()
    },
    onError: (error) => {
      showNotification('error', 'Failed to export data')
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

        {/* Preview */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Preview
          </h3>
          {isLoadingPreview ? (
            <LoadingSpinner size="small" />
          ) : preview ? (
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
            <div className="text-gray-500">No preview available</div>
          )}
        </div>

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
              !selectedTemplate
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