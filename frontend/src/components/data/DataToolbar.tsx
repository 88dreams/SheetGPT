import React, { useState } from 'react'
import { useDataManagement } from '../../hooks/useDataManagement'
import LoadingSpinner from '../common/LoadingSpinner'
import ExportDialog from './ExportDialog'

interface DataToolbarProps {
  selectedDataId: string | null
}

const DataToolbar: React.FC<DataToolbarProps> = ({ selectedDataId }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const {
    deleteData,
    isDeleting
  } = useDataManagement(selectedDataId || '')

  const handleDelete = async () => {
    if (!selectedDataId || isDeleting) return
    await deleteData()
    setShowDeleteConfirm(false)
  }

  return (
    <div className="p-4 border-b flex items-center justify-between">
      <h3 className="text-lg font-medium">Data Management Tools</h3>
      <div className="flex space-x-4">
        <button
          onClick={() => setShowExportDialog(true)}
          disabled={!selectedDataId}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export to Sheets
        </button>
        
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!selectedDataId}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Data
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-red-600">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Delete</span>
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {selectedDataId && showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          dataId={selectedDataId}
        />
      )}
    </div>
  )
}

export default DataToolbar 