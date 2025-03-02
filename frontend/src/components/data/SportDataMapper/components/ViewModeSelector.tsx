import React from 'react';

interface ViewModeSelectorProps {
  viewMode: 'entity' | 'field' | 'global';
  onViewModeChange: (mode: 'entity' | 'field' | 'global') => void;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="flex space-x-1 justify-center">
      <button
        onClick={() => onViewModeChange('entity')}
        className={`px-2 py-1 text-xs rounded-md flex items-center ${
          viewMode === 'entity'
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        Entity
      </button>
      <button
        onClick={() => onViewModeChange('field')}
        className={`px-2 py-1 text-xs rounded-md flex items-center ${
          viewMode === 'field'
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
        Field
      </button>
      <button
        onClick={() => onViewModeChange('global')}
        className={`px-2 py-1 text-xs rounded-md flex items-center ${
          viewMode === 'global'
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Global
      </button>
    </div>
  );
};

export default ViewModeSelector; 