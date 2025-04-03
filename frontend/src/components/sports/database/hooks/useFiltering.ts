import { useState, useEffect, useCallback } from 'react';
import { FilterConfig } from '../../EntityFilter';

export function useFiltering(entityType: string) {
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  // Load saved filters when entity type changes
  useEffect(() => {
    const savedFilters = localStorage.getItem(`${entityType}_filters`);
    if (savedFilters) {
      try {
        setActiveFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Error parsing saved filters:', e);
        setActiveFilters([]);
      }
    } else {
      setActiveFilters([]);
    }
  }, [entityType]);

  // Apply filters and save to local storage
  const handleApplyFilters = useCallback((filters: FilterConfig[]) => {
    // Make a deep copy of the filters to ensure we're not passing references
    const filtersCopy = JSON.parse(JSON.stringify(filters));
    
    // Set the active filters
    setActiveFilters(filtersCopy);
    
    // Save filters to localStorage for persistence
    localStorage.setItem(`${entityType}_filters`, JSON.stringify(filtersCopy));
  }, [entityType]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    console.log(`useFiltering: Clearing all filters for ${entityType}`);
    
    // Clear the active filters
    setActiveFilters([]);
    
    // Clear filters from localStorage
    localStorage.removeItem(`${entityType}_filters`);
    
    // Clear URL search parameters if any
    try {
      const url = new URL(window.location.href);
      // If there are search parameters, remove them and update the URL
      if (url.searchParams.has('searchQuery') || url.searchParams.has('filters')) {
        url.searchParams.delete('searchQuery');
        url.searchParams.delete('filters');
        window.history.replaceState({}, '', url.toString());
        console.log('useFiltering: Cleared URL search parameters');
      }
    } catch (e) {
      console.error('useFiltering: Error clearing URL search parameters:', e);
    }
  }, [entityType]);

  return {
    activeFilters,
    setActiveFilters,
    handleApplyFilters,
    handleClearFilters
  };
}