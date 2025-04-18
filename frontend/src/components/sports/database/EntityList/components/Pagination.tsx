import React from 'react';

interface PaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
  isLoading?: boolean; // Optional loading indicator
  filteredCount?: number | null; // Optional client-side filtered count
  searchQuery?: string; // Optional search query for display
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
  totalItems,
  isLoading = false,
  filteredCount = null,
  searchQuery = ''
}: PaginationProps) {
  // Handler for page size changes that preserves scroll position
  function onPageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Store current scroll position
    const currentScrollY = window.scrollY;
    
    // Get new size from dropdown
    const newPageSize = parseInt(e.target.value, 10);
    
    // Let parent component handle the complex pagination state
    // It will reset page to 1 and update appropriate query state
    setPageSize(newPageSize);
    
    // After a slight delay to allow re-rendering, restore scroll position
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }
  
  // Calculate from/to display
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  
  // Function to preserve scroll position when changing pages
  const changePagePreservingScroll = (newPage: number) => {
    // Store current scroll position
    const currentScrollY = window.scrollY;
    
    // Change the page
    setCurrentPage(newPage);
    
    // After a slight delay to allow re-rendering, restore scroll position
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  };

  // Improved handlers with scroll position preservation
  const handleFirstPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      changePagePreservingScroll(1);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      changePagePreservingScroll(newPage);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      changePagePreservingScroll(newPage);
    }
  };

  const handleLastPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== totalPages) {
      changePagePreservingScroll(totalPages);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm text-gray-700">
            {filteredCount !== null && searchQuery && searchQuery.length >= 3 ? (
              <>Showing {filteredCount} results matching "<span className="font-semibold">{searchQuery}</span>" (filtered from {totalItems} total)</>
            ) : (
              <>Showing {from} to {to} of {totalItems} results</>
            )}
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
            disabled={currentPage <= 1 || isLoading}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="first-page"
          >
            First
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="prev-page"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-700 flex items-center">
            {isLoading && (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></span>
            )}
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            data-testid="next-page"
          >
            Next
          </button>
          <button
            onClick={handleLastPage}
            disabled={currentPage >= totalPages || isLoading}
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