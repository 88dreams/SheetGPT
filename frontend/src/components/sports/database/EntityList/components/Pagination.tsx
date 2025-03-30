import React from 'react';

interface PaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
}

/**
 * Basic Pagination component
 */
export default function Pagination({ 
  currentPage, 
  setCurrentPage, 
  totalPages, 
  pageSize, 
  setPageSize, 
  totalItems 
}: PaginationProps) {
  // Inline handler for page size changes
  function onPageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Get new size from dropdown
    const newPageSize = parseInt(e.target.value, 10);
    
    // First set page to 1, then change page size
    // This order prevents any confusion in state updates
    setCurrentPage(1);
    setPageSize(newPageSize);
  }
  
  // Calculate from/to display
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  
  // Improved handlers to ensure events are completely processed
  const handleFirstPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
    }
  };

  const handleLastPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== totalPages) {
      setCurrentPage(totalPages);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm text-gray-700">
            Showing {from} to {to} of {totalItems} results
          </span>
          
          {/* Plain select with primitive values */}
          <select
            value={pageSize.toString()}
            onChange={onPageSizeChange}
            className="ml-4 border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFirstPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="first-page"
          >
            First
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="prev-page"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-700">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="next-page"
          >
            Next
          </button>
          <button
            onClick={handleLastPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="last-page"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}