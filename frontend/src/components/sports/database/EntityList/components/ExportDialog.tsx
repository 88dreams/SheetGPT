import React from 'react';
import { FaFileCsv, FaGoogle } from 'react-icons/fa';

interface ExportDialogProps {
  showExportDialog: boolean;
  setShowExportDialog: (show: boolean) => void;
  selectedFolderName: string;
  handleFolderSelection: () => void;
  handleCsvExport: () => Promise<void>;
  handleSheetsExport: () => Promise<void>;
  isExporting: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  showExportDialog,
  setShowExportDialog,
  selectedFolderName,
  handleFolderSelection,
  handleCsvExport,
  handleSheetsExport,
  isExporting,
}) => {
  if (!showExportDialog) {
    return null;
  }

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
        
        <p className="text-sm text-gray-600 mb-6">Select an export format. You will be prompted to choose a file name and location by your operating system.</p>

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
              await handleCsvExport();
              setShowExportDialog(false);
            }}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center space-x-1 disabled:bg-gray-400"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : <><FaFileCsv className="inline-block mr-1" size={12} /> Export to CSV</>}
          </button>
          
          <button
            onClick={async () => {
              await handleSheetsExport();
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