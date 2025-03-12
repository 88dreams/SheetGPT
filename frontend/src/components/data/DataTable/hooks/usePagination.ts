import { useState, useCallback, useEffect } from 'react';

interface UsePaginationProps {
  totalItems: number;
  initialRowsPerPage?: number;
  initialPage?: number;
}

export function usePagination({
  totalItems,
  initialRowsPerPage = 50,
  initialPage = 1
}: UsePaginationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [totalRows, setTotalRows] = useState(totalItems);
  const [isPaginationEnabled, setIsPaginationEnabled] = useState(false);

  // Update total rows when totalItems changes
  useEffect(() => {
    setTotalRows(totalItems);
    
    // Check if we should enable pagination based on row count
    const shouldEnablePagination = totalItems > rowsPerPage;
    setIsPaginationEnabled(shouldEnablePagination);
  }, [totalItems, rowsPerPage]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
    
    // Update pagination enabled state
    setIsPaginationEnabled(totalRows > newRowsPerPage);
  }, [totalRows]);

  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const offset = (currentPage - 1) * rowsPerPage;

  return {
    currentPage,
    rowsPerPage,
    totalRows,
    totalPages,
    offset,
    isPaginationEnabled,
    handlePageChange,
    handleRowsPerPageChange
  };
}

export default usePagination;