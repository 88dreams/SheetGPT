import React, { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import LoadingSpinner from '../common/LoadingSpinner'
import { api } from '../../utils/api'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  dataId: string
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, dataId }) => {
  console.log('ExportDialog rendered with CSV option - version 1.0')
  const [exportType, setExportType] = useState<'sheets' | 'csv'>('sheets')
  const [spreadsheetName, setSpreadsheetName] = useState<string>('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedFolderName, setSelectedFolderName] = useState<string>('')
  const { showNotification } = useNotification()

  // Get structured data details to suggest a spreadsheet name
  useEffect(() => {
    const fetchDataDetails = async () => {
      if (dataId) {
        try {
          const data = await api.data.getStructuredDataById(dataId)
          const defaultName = data?.meta_data?.conversation_title || 
                          data?.meta_data?.name || 
                          `Exported Data - ${new Date().toLocaleDateString()}`
          setSpreadsheetName(defaultName)
        } catch (error) {
          console.error('Error fetching data details:', error)
        }
      }
    }
    fetchDataDetails()
  }, [dataId])

  // Export to Google Sheets mutation
  const exportSheetsMutation = useMutation({
    mutationFn: () => api.export.exportToSheets(
      dataId, 
      'default', 
      spreadsheetName, 
      selectedFolderId || undefined
    ),
    onSuccess: (data) => {
      showNotification('success', 'Data exported successfully to Google Sheets')
      if (data?.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank')
      }
      onClose()
    },
    onError: (error: any) => {
      console.error('Export error:', error)
      showNotification('error', 'Failed to export to Google Sheets. Try CSV export instead.')
      // Auto-switch to CSV option on Sheets failure
      setExportType('csv')
    }
  })

  // Export to CSV mutation (uses the same endpoint with a different parameter)
  const exportCsvMutation = useMutation({
    mutationFn: () => api.export.exportToCSV(
      dataId,
      spreadsheetName
    ),
    onSuccess: async (data) => {
      if (data?.csvData) {
        // Create a blob from the CSV data
        const blob = new Blob([data.csvData], { type: 'text/csv' });
        const suggestedName = `${spreadsheetName || 'export'}.csv`;
        
        // Check if the File System Access API is supported
        if ('showSaveFilePicker' in window) {
          try {
            // Use modern File System Access API for OS-level save dialog
            const options = {
              suggestedName,
              types: [{
                description: 'CSV Files',
                accept: { 'text/csv': ['.csv'] }
              }]
            };
            
            // Show OS-level save dialog
            const fileHandle = await window.showSaveFilePicker(options);
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            showNotification('success', 'CSV file saved successfully');
            onClose();
          } catch (err) {
            // User cancelled or API failed, fall back to legacy approach
            if ((err as Error).name !== 'AbortError') {
              console.error('Error using File System Access API:', err);
              // Fall back to legacy download method
              fallbackDownload();
            } else {
              // User cancelled the save dialog
              onClose();
            }
          }
        } else {
          // Fall back to legacy download method for browsers without File System Access API
          fallbackDownload();
        }
        
        // Legacy download method as fallback
        function fallbackDownload() {
          const url = window.URL.createObjectURL(blob);
          
          // Create a temporary link and trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = suggestedName;
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          showNotification('success', 'Data exported successfully to CSV');
          onClose();
        }
      } else {
        showNotification('error', 'CSV data is empty');
      }
    },
    onError: (error: any) => {
      console.error('CSV Export error:', error)
      showNotification('error', 'Failed to export to CSV')
    }
  })

  // Handle folder selection using Google Drive Picker
  const handleSelectFolder = async () => {
    try {
      // Wait for Google API to load if needed (up to 3 seconds)
      if (!window.gapi || !window.google) {
        // Show loading notification
        showNotification('info', 'Loading Google Drive API...')
        
        // Try to wait for API to load (max 3 seconds)
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => setTimeout(resolve, 500))
          if (window.gapi && window.google) break
        }
        
        // Check again after waiting
        if (!window.gapi || !window.google) {
          showNotification('error', 'Google Drive API failed to load. Please refresh the page.')
          return
        }
      }
      
      // Get OAuth token from backend
      const authStatus = await api.export.getAuthStatus()
      if (!authStatus.authenticated) {
        // If not authenticated, start auth flow
        const { url } = await api.export.getAuthUrl()
        window.open(url, '_blank')
        showNotification('info', 'Please authenticate with Google Drive and try again')
        return
      }
      
      // Ensure the picker API is loaded
      if (!window.google.picker) {
        // Show loading notification
        showNotification('info', 'Loading Google Picker API...')
        
        try {
          // Load picker API
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Picker API load timeout'))
            }, 5000)
            
            gapi.load('picker', { 
              callback: () => {
                clearTimeout(timeoutId)
                resolve(null)
              }, 
              onerror: (err: any) => {
                clearTimeout(timeoutId)
                reject(err)
              }
            })
          })
        } catch (error) {
          console.error('Failed to load picker API:', error)
          showNotification('error', 'Google Picker API failed to load')
          return
        }
        
        // Verify picker is loaded
        if (!window.google.picker) {
          showNotification('error', 'Google Picker API is not available')
          return
        }
      }
      
      // Get OAuth token from backend again (should be set now)
      const tokenResponse = await api.export.getToken()
      if (!tokenResponse.token) {
        showNotification('error', 'Could not retrieve OAuth token')
        return
      }
      
      // Create and open picker with token
      // We need to use the Google Drive API key
      const API_KEY = 'AIzaSyAiQM2uYihHnbcR9BQ1s6XnJvh6MvRaOVE'; // Sample key - replace with actual API key
      
      // Create the folder view
      const docsView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMode(google.picker.DocsViewMode.LIST)
      
      // Create the picker with more features
      const pickerBuilder = new google.picker.PickerBuilder()
        .addView(docsView)
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MINE_ONLY)
        .setOAuthToken(tokenResponse.token)
        .setDeveloperKey(API_KEY)
        .setTitle('Select a folder for your spreadsheet')
        .setCallback((data) => {
          if (data.action === google.picker.Action.PICKED) {
            const folder = data.docs[0]
            console.log('Selected folder:', folder)
            setSelectedFolderId(folder.id)
            setSelectedFolderName(folder.name)
          }
        })
      
      // Build and open the picker
      const picker = pickerBuilder.build()
      
      picker.setVisible(true)
    } catch (error) {
      console.error('Error opening Google Drive picker:', error)
      showNotification('error', 'Failed to open folder picker')
      
      // Prompt for manual folder ID entry as fallback
      const folderId = prompt('Please enter a Google Drive folder ID manually:')
      if (folderId) {
        setSelectedFolderId(folderId)
        setSelectedFolderName('Manually entered folder')
      }
    }
  }

  // We're now directly calling the respective mutation from each button's onClick handler
  // rather than using a shared function to avoid race conditions with state updates

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[450px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* File Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Name
          </label>
          <input
            type="text"
            value={spreadsheetName}
            onChange={(e) => setSpreadsheetName(e.target.value)}
            placeholder={`Enter ${exportType === 'sheets' ? 'spreadsheet' : 'file'} name`}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        {/* Folder Selection (Only for Google Sheets) */}
        {exportType === 'sheets' && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Destination Folder
              </label>
              <div className="flex space-x-2">
                <button 
                  onClick={handleSelectFolder}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Select Folder
                </button>
                
                <button
                  onClick={() => {
                    // Prompt for manual folder ID entry
                    const folderId = prompt('Please enter a Google Drive folder ID:')
                    if (folderId) {
                      setSelectedFolderId(folderId)
                      setSelectedFolderName('Manually entered folder')
                    }
                  }}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  title="Enter folder ID manually"
                >
                  Manual ID
                </button>
              </div>
            </div>
            {selectedFolderName && (
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                Selected: {selectedFolderName}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              console.log('CSV export button clicked');
              // Directly call exportCsvMutation instead of changing state first
              exportCsvMutation.mutate();
            }}
            disabled={(exportSheetsMutation.isPending || exportCsvMutation.isPending) || !spreadsheetName}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {exportCsvMutation.isPending ? (
              <>
                <LoadingSpinner size="small" className="text-white" />
                <span>Exporting...</span>
              </>
            ) : (
              "Export to CSV"
            )}
          </button>
          <button
            onClick={() => {
              console.log('Google Sheets export button clicked');
              // Directly call exportSheetsMutation instead of changing state first
              exportSheetsMutation.mutate();
            }}
            disabled={(exportSheetsMutation.isPending || exportCsvMutation.isPending) || !spreadsheetName}
            className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {exportSheetsMutation.isPending ? (
              <>
                <LoadingSpinner size="small" className="text-white" />
                <span>Exporting...</span>
              </>
            ) : (
              "Export to Google Sheets"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog