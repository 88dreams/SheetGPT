import { useState, useCallback, useMemo, useEffect } from 'react';
import React from 'react';

interface UseRowSelectionProps {
  itemCount: number; // Total number of items that can be selected
}

interface UseRowSelectionReturn {
  selectedRows: Set<number>; // Set of selected row indices
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>; // Allow external clearing
  selectAll: boolean;
  toggleRowSelection: (rowIndex: number) => void;
  toggleSelectAll: () => void;
  hasSelection: boolean;
  selectedRowCount: number;
}

export const useRowSelection = ({
  itemCount,
}: UseRowSelectionProps): UseRowSelectionReturn => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);

  const toggleRowSelection = useCallback((rowIndex: number) => {
    setSelectedRows(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(rowIndex)) {
        newSelected.delete(rowIndex);
      } else {
        newSelected.add(rowIndex);
      }
      // Update selectAll state based on the new selection
      setSelectAll(newSelected.size === itemCount && itemCount > 0);
      return newSelected;
    });
  }, [itemCount]); // Depend on itemCount

  const toggleSelectAll = useCallback(() => {
    setSelectAll(prevSelectAll => {
      const nextSelectAll = !prevSelectAll;
      if (nextSelectAll) {
        // Select all indices from 0 to itemCount - 1
        const allIndexes = new Set<number>();
        for (let i = 0; i < itemCount; i++) {
          allIndexes.add(i);
        }
        setSelectedRows(allIndexes);
      } else {
        setSelectedRows(new Set());
      }
      return nextSelectAll;
    });
  }, [itemCount]); // Depend on itemCount

  // Derived state
  const hasSelection = useMemo(() => selectedRows.size > 0, [selectedRows]);
  const selectedRowCount = useMemo(() => selectedRows.size, [selectedRows]);

  // Reset selection if itemCount changes (e.g., new query results)
  useEffect(() => {
    setSelectedRows(new Set());
    setSelectAll(false);
  }, [itemCount]);

  return {
    selectedRows,
    setSelectedRows, // Expose setter for external clearing if needed
    selectAll,
    toggleRowSelection,
    toggleSelectAll,
    hasSelection,
    selectedRowCount,
  };
};

export default useRowSelection; 