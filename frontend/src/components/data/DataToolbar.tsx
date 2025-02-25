import React, { useState } from 'react'
import { useDataManagement } from '../../hooks/useDataManagement'
import LoadingSpinner from '../common/LoadingSpinner'
import ExportDialog from './ExportDialog'

interface DataToolbarProps {
  selectedDataId: string | null
}

const DataToolbar: React.FC<DataToolbarProps> = ({ selectedDataId }) => {
  const [showExportDialog, setShowExportDialog] = useState(false)
  const {
    isDeleting
  } = useDataManagement(selectedDataId || '')

  return (
    <div className="p-4 border-b flex items-center justify-between">
      <h3 className="text-lg font-medium">Data Tools</h3>
      <div className="flex space-x-4">
        <button
          onClick={() => setShowExportDialog(true)}
          disabled={!selectedDataId}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export to Sheets
        </button>
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