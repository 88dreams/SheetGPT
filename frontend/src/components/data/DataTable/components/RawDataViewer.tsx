import React from 'react';
import { FaExpand, FaCompress } from 'react-icons/fa';

interface RawDataViewerProps {
  data: any;
  height: number;
  isExpanded: boolean;
  toggleExpansion: () => void;
  onResize: (e: React.MouseEvent) => void;
}

const RawDataViewer: React.FC<RawDataViewerProps> = ({
  data,
  height,
  isExpanded,
  toggleExpansion,
  onResize
}) => {
  return (
    <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Raw Data</h3>
          <p className="text-sm text-gray-500">JSON format</p>
        </div>
        <button
          onClick={toggleExpansion}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {isExpanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
        </button>
      </div>
      <div 
        className="p-4 overflow-auto" 
        style={{ 
          maxHeight: `${height}px`,
          overflowX: 'auto',
          overflowY: 'auto'
        }}
      >
        <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      
      {/* Resizer handle */}
      <div 
        className="h-2 bg-gray-100 cursor-ns-resize flex justify-center items-center hover:bg-gray-200"
        onMouseDown={onResize}
      >
        <div className="w-10 h-1 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
};

export default RawDataViewer;