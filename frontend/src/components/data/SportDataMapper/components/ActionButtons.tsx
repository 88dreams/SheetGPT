import React from 'react';

interface ActionButtonsProps {
  selectedEntityType: string | null;
  isSaving: boolean;
  isBatchImporting: boolean;
  onSaveToDatabase: () => void;
  onBatchImport: () => void;
  onSendToData?: () => void; // Optional callback for sending to data management
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedEntityType,
  isSaving,
  isBatchImporting,
  onSaveToDatabase,
  onBatchImport,
  onSendToData
}) => {
  return (
    <div className="mt-4 flex justify-center space-x-3">
      <button
        onClick={onSaveToDatabase}
        disabled={!selectedEntityType || isSaving}
        className={`px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-all flex items-center ${
          !selectedEntityType || isSaving
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {isSaving ? (
          <>
            <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save & Next
          </>
        )}
      </button>
      
      <button
        onClick={onBatchImport}
        disabled={!selectedEntityType || isBatchImporting}
        className={`px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-all flex items-center ${
          !selectedEntityType || isBatchImporting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {isBatchImporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Importing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Batch Import All
          </>
        )}
      </button>
      
      {/* Only show Send to Data button if the callback is provided */}
      {onSendToData && (
        <button
          onClick={onSendToData}
          disabled={!selectedEntityType}
          className={`px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-all flex items-center ${
            !selectedEntityType
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Send to Data
        </button>
      )}
    </div>
  );
};

export default ActionButtons; 