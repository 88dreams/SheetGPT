import React from 'react';
import { FaFileCsv, FaGoogle } from 'react-icons/fa';

interface ExportDialogProps {
  showExportDialog: boolean;
  setShowExportDialog: (show: boolean) => void;
  exportFileName: string;
  setExportFileName: (name: string) => void;
  selectedFolderName: string;
  handleFolderSelection: () => void;
  handleCsvExport: (visibleColumns: string[]) => Promise<void>;
  handleSheetsExport: (entities: any[], visibleColumns: string[]) => Promise<void>;
  entities: any[];
  visibleColumns: string[];
  isExporting: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  showExportDialog,
  setShowExportDialog,
  exportFileName,
  setExportFileName,
  selectedFolderName,
  handleFolderSelection,
  handleCsvExport,
  handleSheetsExport,
  entities,
  visibleColumns,
  isExporting,
}) => {
  if (!showExportDialog) {
    return null;
  }

  // Get visible column names in the correct order
  const getVisibleColumnNames = () => {
    // Filter visible columns that actually exist in the data
    return visibleColumns.filter(col => entities[0]?.hasOwnProperty(col));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[450px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Data</h2>
          <button
            onClick={() => setShowExportDialog(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        {/* Simple Export Dialog with just file name, select folder, and export/cancel */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Name
          </label>
          <input
            type="text"
            value={exportFileName}
            onChange={(e) => setExportFileName(e.target.value)}
            placeholder="Enter file name"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        {/* Folder Selection for Google Sheets */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Destination Folder (Sheets only)
            </label>
            <div className="flex space-x-2">
              <button 
                onClick={handleFolderSelection}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select Folder
              </button>
            </div>
          </div>
          {selectedFolderName && (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
              Selected: {selectedFolderName}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setShowExportDialog(false)}
            className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          
          <button
            onClick={async () => {
              const visibleColumnNames = getVisibleColumnNames();
              await handleCsvExport(visibleColumnNames);
              setShowExportDialog(false);
            }}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center space-x-1 disabled:bg-gray-400"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : <><FaFileCsv className="inline-block mr-1" size={12} /> Export to CSV</>}
          </button>
          
          <button
            onClick={async () => {
              const visibleColumnNames = getVisibleColumnNames();
              await handleSheetsExport(entities, visibleColumnNames);
            }}
            className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center space-x-1"
          >
            <FaGoogle className="inline-block mr-1" size={12} />
            Export to Google Sheets
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;