import { useState, useEffect, useCallback } from 'react';
import { FilterConfig } from '../../EntityFilter';

export function useFiltering(entityType: string) {
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

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

  const handleApplyFilters = useCallback((incomingFilters: FilterConfig[]) => {
    const filtersToApply = JSON.parse(JSON.stringify(incomingFilters));    
    setActiveFilters(filtersToApply);
    try {
      localStorage.setItem(`${entityType}_filters`, JSON.stringify(filtersToApply));
    } catch (e) {
      console.error('Error saving filters to localStorage:', e);
    }
  }, [entityType]);

  const handleClearFilters = useCallback(() => {
    console.log(`useFiltering: Clearing all filters for ${entityType}`);
    setActiveFilters([]);
    try {
      localStorage.removeItem(`${entityType}_filters`);
    } catch (e) {
      console.error('Error removing filters from localStorage:', e);
    }
    
    try {
      const url = new URL(window.location.href);
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