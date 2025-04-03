import { useState, useCallback } from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import React from 'react';

/**
 * Custom hook that manages sorting state for entity lists.
 * 
 * Use server-side sorting for all fields, including relationship fields.
 * When sorting changes, the hook will reset pagination to the first page.
 */
export function useSorting() {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Removed 'none' option for consistency
  
  // Internal function to reset pagination when sort changes
  // This must be provided by the parent component
  const [resetPagination, setResetPagination] = useState<(() => void) | null>(null);

  // Handle sort column change
  const handleSort = useCallback((field: string) => {
    // Log before change
    console.log(`useSorting: handleSort called with field=${field}, current sortField=${sortField}, sortDirection=${sortDirection}`);
    
    // Determine the new direction based on current state
    let newDirection: 'asc' | 'desc' = 'asc';
    
    // If clicking the same field, toggle between asc and desc
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log(`useSorting: Toggling sort direction for ${field} from ${sortDirection} to ${newDirection}`);
    } else {
      console.log(`useSorting: Changing sort field from ${sortField} to ${field} with direction ${newDirection}`);
    }
    
    // CRITICAL: Reset pagination before updating sort state to ensure we fetch correct data
    // This ensures we always see freshly sorted results beginning from page 1
    if (resetPagination) {
      console.log('useSorting: Resetting pagination to page 1 BEFORE updating sort parameters');
      resetPagination();
    } else {
      console.warn('useSorting: No pagination reset function available - sort may not apply to all items');
    }
    
    // Update sort state AFTER pagination is reset to prevent race conditions
    // This sequence ensures the next data fetch will use the new sort parameters
    setTimeout(() => {
      const isChangingField = sortField !== field;
      if (isChangingField) {
        console.log(`useSorting: Setting sort field to "${field}" and direction to "asc"`);
        setSortField(field);
        setSortDirection('asc');
      } else {
        console.log(`useSorting: Setting sort direction to "${newDirection}"`);
        setSortDirection(newDirection);
      }
      
      console.log(`useSorting: Sort updated: field=${field}, direction=${isChangingField ? 'asc' : newDirection}`);
    }, 0); // Use a timeout to ensure we don't have state updates in the same render cycle
  }, [sortField, sortDirection, resetPagination]);
  
  // Register function to reset pagination
  const registerResetPagination = useCallback((resetFn: () => void) => {
    console.log('useSorting: Registering pagination reset function');
    setResetPagination(() => resetFn);
  }, []);

  // Get sorted entities based on current sort settings
  // This is used for client-side sorting, which we prefer to avoid for relationship fields
  const getSortedEntities = useCallback((entities: Record<string, unknown>[]) => {
    console.log(`useSorting.getSortedEntities: This function is deprecated and should not be used. Server-side sorting is preferred.`);
    
    if (!entities || entities.length === 0) {
      return entities || [];
    }
    
    // Always sort by a stable field
    const effectiveField = sortField || 'id';
    
    // Make a copy to avoid modifying the original array
    return [...entities].sort((a, b) => {
      // Get values, defaulting to empty string if missing
      const aValue = a[effectiveField] ?? '';
      const bValue = b[effectiveField] ?? '';
      
      // Handle different field types appropriately
      
      // Handle dates
      if (effectiveField.includes('date') || 
          effectiveField === 'created_at' || 
          effectiveField === 'updated_at') {
        const aDate = new Date(aValue as string).getTime() || 0;
        const bDate = new Date(bValue as string).getTime() || 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle strings (most common case, including names and league_name)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      // Use localeCompare for proper alphabetical sorting
      return sortDirection === 'asc' ? 
        aStr.localeCompare(bStr, undefined, { sensitivity: 'base' }) : 
        bStr.localeCompare(aStr, undefined, { sensitivity: 'base' });
    });
  }, [sortField, sortDirection]);

  // Render appropriate sort icon
  const renderSortIcon = useCallback((field: string) => {
    if (sortField !== field) {
      // Unsorted column
      return React.createElement(FaSort, { className: "ml-1 text-gray-400" });
    } else {
      // Active sort column - always show either asc or desc
      return sortDirection === 'asc' ? 
        React.createElement(FaSortUp, { className: "ml-1 text-blue-600" }) : 
        React.createElement(FaSortDown, { className: "ml-1 text-blue-600" });
    }
  }, [sortField, sortDirection]);

  return {
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    handleSort,
    getSortedEntities, // Kept for backwards compatibility
    renderSortIcon,
    registerResetPagination
  };
}