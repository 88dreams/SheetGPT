import React from 'react';
import { FaChevronLeft, FaChevronRight, FaStepBackward, FaStepForward } from 'react-icons/fa';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  rowsPerPage,
  totalRows,
  onPageChange,
  onRowsPerPageChange
}) => {
  return (
    <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Rows per page:
        </span>
        <select
          value={rowsPerPage}
          onChange={onRowsPerPageChange}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-700 mr-2">
          {(currentPage - 1) * rowsPerPage + 1}-
          {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows}
        </span>
        
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`p-1 rounded ${
            currentPage === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="First page"
        >
          <FaStepBackward size={14} />
        </button>
        
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1 rounded ${
            currentPage === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Previous page"
        >
          <FaChevronLeft size={14} />
        </button>
        
        <div className="px-2 py-1 text-sm">
          Page {currentPage} of {totalPages}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-1 rounded ${
            currentPage === totalPages 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Next page"
        >
          <FaChevronRight size={14} />
        </button>
        
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-1 rounded ${
            currentPage === totalPages 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Last page"
        >
          <FaStepForward size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;