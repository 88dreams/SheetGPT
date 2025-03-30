import { useState, useCallback } from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import React from 'react';

export function useSorting() {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('asc');

  // Handle sort column change
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // If clicking the same field, cycle through: asc -> desc -> asc
      // Removed the 'none' state as it causes unpredictable sorting
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    } else {
      // If clicking a new field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Log the sort change for debugging
    console.log(`Sort changed: field=${field}, direction=${
      sortField === field 
        ? (sortDirection === 'asc' ? 'desc' : 'asc') 
        : 'asc'
    }`);
  }, [sortField, sortDirection]);

  // Get sorted entities based on current sort settings
  const getSortedEntities = useCallback((entities: Record<string, unknown>[]) => {
    if (!entities || entities.length === 0) {
      return entities || [];
    }
    
    // Always sort by a stable field even when sortDirection is 'none' or sortField is empty
    // This ensures consistent order during pagination
    const effectiveField = sortField || 'id';
    const effectiveDirection = sortDirection === 'none' ? 'asc' : sortDirection;
    
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
        return effectiveDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return effectiveDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle strings (most common case, including names and league_name)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      // Use localeCompare for proper alphabetical sorting
      return effectiveDirection === 'asc' ? 
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
    getSortedEntities,
    renderSortIcon
  };
}