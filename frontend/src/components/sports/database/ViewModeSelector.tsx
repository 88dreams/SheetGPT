import React from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
// @ts-ignore
import { FaList, FaGlobe, FaTable } from 'react-icons/fa';

interface ViewModeSelectorProps {
  className?: string;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ className = '' }) => {
  const { viewMode, setViewMode } = useSportsDatabase();

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="flex space-x-2">
        <button
          className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
            viewMode === 'entity'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => setViewMode('entity')}
        >
          <FaList className="mr-2" /> Entities
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
            viewMode === 'global'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => setViewMode('global')}
        >
          <FaGlobe className="mr-2" /> Global
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
            viewMode === 'fields'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => setViewMode('fields')}
        >
          <FaTable className="mr-2" /> Fields
        </button>
      </div>
    </div>
  );
};

export default ViewModeSelector; 