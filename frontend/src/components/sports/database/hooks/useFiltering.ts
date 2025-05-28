import { useState, useEffect, useCallback } from 'react';
import { FilterConfig } from '../../EntityFilter';

export function useFiltering(entityType: string) {
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  useEffect(() => {
    const savedFiltersString = localStorage.getItem(`${entityType}_filters`);
    if (savedFiltersString) {
      try {
        const parsedFilters = JSON.parse(savedFiltersString);
        // Only set if different to avoid new array reference for same empty state
        if (JSON.stringify(activeFilters) !== savedFiltersString) {
          setActiveFilters(parsedFilters);
        }
      } catch (e) {
        console.error('Error parsing saved filters:', e);
        if (activeFilters.length > 0) setActiveFilters([]); // Clear if error and not already empty
      }
    } else {
      // If no saved filters, only clear if activeFilters is not already empty
      if (activeFilters.length > 0) {
      setActiveFilters([]);
      }
    }
  }, [entityType]); // activeFilters removed from here as it causes loop on init

  const handleApplyFilters = useCallback((incomingFilters: FilterConfig[]) => {
    const incomingFiltersString = JSON.stringify(incomingFilters);
    const currentFiltersString = JSON.stringify(activeFilters);

    if (currentFiltersString !== incomingFiltersString) {
      console.log(`useFiltering: Applying new filters for ${entityType}`, incomingFilters);
      // incomingFilters is usually a new array from EntityList search logic,
      // so passing it directly to setActiveFilters is generally safe and preferred.
      setActiveFilters(incomingFilters);
    try {
        localStorage.setItem(`${entityType}_filters`, incomingFiltersString);
    } catch (e) {
      console.error('Error saving filters to localStorage:', e);
    }
    } else {
      console.log(`useFiltering: Filters haven't changed for ${entityType}, skipping update.`);
    }
  }, [entityType, activeFilters]);

  const handleClearFilters = useCallback(() => {
    console.log(`useFiltering: Clearing all filters for ${entityType}`);
    if (activeFilters.length > 0) { // Only update if there's something to clear
    setActiveFilters([]);
    }
    try {
      localStorage.removeItem(`${entityType}_filters`);
    } catch (e) {
      console.error('Error removing filters from localStorage:', e);
    }
    
    // Clear URL parameters
    try {
      const url = new URL(window.location.href);
      let urlChanged = false;
      if (url.searchParams.has('searchQuery')) {
        url.searchParams.delete('searchQuery');
        urlChanged = true;
      }
      if (url.searchParams.has('filters')) {
        url.searchParams.delete('filters');
        urlChanged = true;
      }
      if (urlChanged) {
        window.history.replaceState({}, '', url.toString());
        console.log('useFiltering: Cleared URL search parameters');
      }
    } catch (e) {
      console.error('useFiltering: Error clearing URL search parameters:', e);
    }
  }, [entityType, activeFilters]); // Added activeFilters dependency

  return {
    activeFilters,
    // setActiveFilters, // Typically not exposed directly if managed by handlers
    handleApplyFilters,
    handleClearFilters
  };
}