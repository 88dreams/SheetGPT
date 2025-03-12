import React from 'react';
import { FaFileExport } from 'react-icons/fa';

interface PageActionsProps {
  selectedDataId: string | null;
}

const PageActions: React.FC<PageActionsProps> = ({ selectedDataId }) => (
  <div className="flex gap-2">
    <button 
      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
      onClick={() => window.location.href = '/export'}
      disabled={!selectedDataId}
    >
      <FaFileExport className="mr-2" /> Export
    </button>
  </div>
);

export default PageActions;