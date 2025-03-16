import { useState, useCallback } from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import React from 'react';

export function useSorting() {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('asc');

  // Handle sort column change
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // If clicking the same field, cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField('');
        setSortDirection('none');
      } else {
        setSortDirection('asc');
      }
    } else {
      // If clicking a new field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Get sorted entities based on current sort settings
  const getSortedEntities = useCallback((entities: Record<string, unknown>[]) => {
    if (!entities || entities.length === 0 || !sortField || sortDirection === 'none') {
      return entities || [];
    }
    
    return [...entities].sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';
      
      // Handle dates
      if (sortField.includes('date') || sortField === 'created_at' || sortField === 'updated_at') {
        const aDate = new Date(aValue as string).getTime();
        const bDate = new Date(bValue as string).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' ? 
        aStr.localeCompare(bStr) : 
        bStr.localeCompare(aStr);
    });
  }, [sortField, sortDirection]);

  // Render appropriate sort icon
  const renderSortIcon = useCallback((field: string) => {
    if (sortField !== field || sortDirection === 'none') {
      return React.createElement(FaSort, { className: "ml-1 text-gray-400" });
    }
    return sortDirection === 'asc' ? 
      React.createElement(FaSortUp, { className: "ml-1 text-blue-600" }) : 
      React.createElement(FaSortDown, { className: "ml-1 text-blue-600" });
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