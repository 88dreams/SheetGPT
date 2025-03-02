import React from 'react';

interface RecordNavigationProps {
  currentRecordIndex: number | null;
  totalRecords: number;
  includedRecordsCount: number;
  isCurrentRecordExcluded: boolean;
  onPreviousRecord: () => void;
  onNextRecord: () => void;
  onToggleExcludeRecord: () => void;
}

const RecordNavigation: React.FC<RecordNavigationProps> = ({
  currentRecordIndex,
  totalRecords,
  includedRecordsCount,
  isCurrentRecordExcluded,
  onPreviousRecord,
  onNextRecord,
  onToggleExcludeRecord
}) => {
  return (
    <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded-md border border-gray-200">
      <div className="flex items-center space-x-2">
        <button
          onClick={onPreviousRecord}
          disabled={currentRecordIndex === 0}
          className={`p-1 rounded-md ${
            currentRecordIndex === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
          title="Previous Record"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="text-sm text-gray-600">
          Record <span className="font-medium text-gray-800">{currentRecordIndex !== null ? currentRecordIndex + 1 : 0}</span> of <span className="font-medium text-gray-800">{totalRecords}</span>
        </div>
        <button
          onClick={onNextRecord}
          disabled={currentRecordIndex === totalRecords - 1}
          className={`p-1 rounded-md ${
            currentRecordIndex === totalRecords - 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
          title="Next Record"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center">
        <div className="text-xs text-gray-500 mr-2">
          <span className="font-medium text-gray-700">{includedRecordsCount}</span> of <span className="font-medium text-gray-700">{totalRecords}</span> records included
        </div>
        <button
          onClick={onToggleExcludeRecord}
          className={`px-2 py-1 text-xs rounded-md flex items-center ${
            isCurrentRecordExcluded
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {isCurrentRecordExcluded ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Include Record
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exclude Record
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RecordNavigation; 