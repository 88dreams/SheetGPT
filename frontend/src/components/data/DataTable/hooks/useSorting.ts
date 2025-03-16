import { useState } from 'react';
import React from 'react';

export type SortDirection = 'asc' | 'desc' | 'none';

interface UseSortingParams {
  initialSortField?: string;
  initialSortDirection?: SortDirection;
}

export default function useSorting({ 
  initialSortField = '', 
  initialSortDirection = 'none' 
}: UseSortingParams = {}) {
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const handleSort = (field: string) => {
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
  };

  const getSortedData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!data || data.length === 0 || !sortField || sortDirection === 'none') {
      return data;
    }
    
    return [...data].sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';
      
      // Handle dates
      if (
        sortField.includes('date') || 
        sortField === 'created_at' || 
        sortField === 'updated_at'
      ) {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
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
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return React.createElement('span', { className: "ml-1 text-gray-400" }, '⇅');
    }
    return sortDirection === 'asc' ? 
      React.createElement('span', { className: "ml-1 text-indigo-600" }, '↑') : 
      React.createElement('span', { className: "ml-1 text-indigo-600" }, '↓');
  };

  return {
    sortField,
    sortDirection,
    handleSort,
    getSortedData,
    renderSortIcon,
  };
}