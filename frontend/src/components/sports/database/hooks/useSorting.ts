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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    getSortedEntities, // Kept for backwards compatibility
    renderSortIcon,
  };
}