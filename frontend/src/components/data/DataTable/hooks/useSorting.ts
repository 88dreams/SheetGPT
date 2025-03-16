import { useState, useCallback, useMemo } from 'react';

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc' | 'none';

/**
 * Interface for useSorting hook parameters
 */
interface UseSortingProps<T> {
  initialSortField?: string;
  initialSortDirection?: SortDirection;
  data?: T[];
  getItemValue?: (item: T, fieldName: string) => any;
}

/**
 * Interface for useSorting hook return values
 */
interface UseSortingResult<T> {
  sortField: string;
  sortDirection: SortDirection;
  setSortField: (field: string) => void;
  setSortDirection: (direction: SortDirection) => void;
  handleSort: (field: string) => void;
  getSortedData: (items: T[]) => T[];
  renderSortIcon: (field: string) => JSX.Element | null;
}

/**
 * A custom hook for managing sorting state and operations
 * 
 * @param initialSortField - Starting sort field
 * @param initialSortDirection - Starting sort direction
 * @param data - Optional data array to sort
 * @param getItemValue - Optional function to extract value for sorting
 * @returns Sorting state and handlers
 */
export function useSorting<T>({
  initialSortField = '',
  initialSortDirection = 'none',
  data,
  getItemValue
}: UseSortingProps<T> = {}): UseSortingResult<T> {
  // Sort state
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  /**
   * Default value getter if one isn't provided
   */
  const defaultGetItemValue = useCallback((item: any, fieldName: string): any => {
    return item[fieldName];
  }, []);

  /**
   * Handler for sort column click
   */
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // Cycle through sort directions: none -> asc -> desc -> none
      setSortDirection(prev => {
        if (prev === 'none') return 'asc';
        if (prev === 'asc') return 'desc';
        return 'none';
      });
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  /**
   * Function to sort data based on current sort state
   */
  const getSortedData = useCallback((items: T[]): T[] => {
    if (!sortField || sortDirection === 'none' || !items || items.length === 0) {
      return items;
    }

    const getValue = getItemValue || defaultGetItemValue;

    return [...items].sort((a, b) => {
      const aValue = getValue(a, sortField);
      const bValue = getValue(b, sortField);

      // Handle different data types appropriately
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Default comparison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortField, sortDirection, getItemValue, defaultGetItemValue]);

  /**
   * Memoized sorted data (if data is provided)
   */
  const sortedData = useMemo(() => {
    if (!data) return undefined;
    return getSortedData(data);
  }, [data, getSortedData]);

  /**
   * Render function for sort indicators
   */
  const renderSortIcon = useCallback((field: string): JSX.Element | null => {
    if (sortField !== field) {
      return null;
    }

    if (sortDirection === 'asc') {
      return { type: 'span', props: { className: 'ml-1', children: '▲' } } as any;
    } else if (sortDirection === 'desc') {
      return { type: 'span', props: { className: 'ml-1', children: '▼' } } as any;
    }
    
    return null;
  }, [sortField, sortDirection]);

  return {
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    handleSort,
    getSortedData,
    renderSortIcon
  };
}

export default useSorting;