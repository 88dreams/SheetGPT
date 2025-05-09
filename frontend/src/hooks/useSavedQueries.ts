import { useState, useEffect, useCallback } from 'react';

export interface SavedQuery {
  id: string | number; // Typically number (Date.now()) but allow string for future flexibility
  name: string;
  query: string; // This would be the natural language query if isNaturalLanguage is true
  sql?: string;   // The generated/manual SQL
  isNaturalLanguage: boolean;
  timestamp: string;
}

interface UseSavedQueriesReturn {
  savedQueries: SavedQuery[];
  addSavedQuery: (queryDetails: Omit<SavedQuery, 'id' | 'timestamp'>) => SavedQuery;
  deleteSavedQuery: (queryId: string | number) => void;
  // loadSavedQuery: (queryId: string | number) => SavedQuery | undefined; // Component can filter savedQueries array
}

const SAVED_QUERIES_STORAGE_KEY = 'savedQueries';

export const useSavedQueries = (): UseSavedQueriesReturn => {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  useEffect(() => {
    try {
      const storedQueries = localStorage.getItem(SAVED_QUERIES_STORAGE_KEY);
      if (storedQueries) {
        const parsedQueries = JSON.parse(storedQueries) as Array<any>; // Parse as any first
        const normalizedQueries: SavedQuery[] = parsedQueries.map(q => ({
          // Ensure all fields conform to SavedQuery type, especially timestamp
          id: q.id || Date.now(), // Keep as number or string based on original type for now
          name: String(q.name || 'Untitled Query'),
          query: String(q.query || ''),
          sql: q.sql ? String(q.sql) : undefined,
          isNaturalLanguage: Boolean(q.isNaturalLanguage || false),
          timestamp: typeof q.timestamp === 'number' 
            ? new Date(q.timestamp).toISOString() 
            : String(q.timestamp || new Date().toISOString()), // Ensure timestamp is string
        }));
        setSavedQueries(normalizedQueries);
      }
    } catch (error) {
      console.error('Error loading saved queries from localStorage:', error);
      setSavedQueries([]); // Initialize with empty array on error
    }
  }, []);

  const updateLocalStorage = (queries: SavedQuery[]) => {
    try {
      localStorage.setItem(SAVED_QUERIES_STORAGE_KEY, JSON.stringify(queries));
    } catch (error) {
      console.error('Error saving queries to localStorage:', error);
    }
  };

  const addSavedQuery = useCallback((queryDetails: Omit<SavedQuery, 'id' | 'timestamp'>): SavedQuery => {
    const newQuery: SavedQuery = {
      ...queryDetails,
      id: Date.now(), // Simple ID generation
      timestamp: new Date().toISOString(),
    };
    setSavedQueries(prevQueries => {
      const updatedQueries = [...prevQueries, newQuery];
      updateLocalStorage(updatedQueries);
      return updatedQueries;
    });
    return newQuery;
  }, []);

  const deleteSavedQuery = useCallback((queryId: string | number) => {
    setSavedQueries(prevQueries => {
      const updatedQueries = prevQueries.filter(q => q.id !== queryId);
      updateLocalStorage(updatedQueries);
      return updatedQueries;
    });
  }, []);

  return {
    savedQueries,
    addSavedQuery,
    deleteSavedQuery,
  };
};

export default useSavedQueries; 