import { useState, useCallback, useMemo } from 'react';

export function useEntityPagination(defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalItems, setTotalItems] = useState(0);

  // Calculate total pages based on total items and page size
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  // Handle page change with validation
  const handlePageChange = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  // Handle page size change
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    // Reset to first page when changing page size
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage: handlePageChange,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalItems,
    setTotalItems,
    totalPages
  };
}