import React from 'react';
import { FaFileCsv, FaGoogle } from 'react-icons/fa';

interface ExportContactsDialogProps {
  show: boolean;
  onClose: () => void;
  onExportCsv: () => void;
  onExportSheets: () => void;
  isExporting: boolean;
}

const ExportContactsDialog: React.FC<ExportContactsDialogProps> = ({
  show,
  onClose,
  onExportCsv,
  onExportSheets,
  isExporting,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[450px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">Select an export format. For CSV exports, you will be prompted to choose a file name and location by your operating system.</p>

        <div className="flex justify-end space-x-2 mt-8">
          <button onClick={onClose} className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100">
            Cancel
          </button>
          
          <button
            onClick={onExportCsv}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center space-x-1 disabled:bg-gray-400"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : <><FaFileCsv className="inline-block mr-1" size={12} /> Export to CSV</>}
          </button>
          
          <button
            onClick={onExportSheets}
            className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center space-x-1"
            disabled={isExporting}
          >
            <FaGoogle className="inline-block mr-1" size={12} />
            Export to Google Sheets
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportContactsDialog; 