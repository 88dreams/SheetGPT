import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../utils/apiClient'; // Assuming apiClient is set up

// 1. Define Frontend Types for Schema Summary (mirroring backend Pydantic models)
export interface SchemaColumn {
  name: string;
  dataType?: string | null;
  description?: string | null;
  isFilterable?: boolean; // Will be false initially from backend
  isRelationalId?: boolean;
  relatedTable?: string | null;
}

export interface SchemaTable {
  name: string;
  description?: string | null;
  columns: SchemaColumn[];
}

export interface SchemaSummaryResponse {
  tables: SchemaTable[];
}

// 2. Define Context State Interface
interface SchemaContextState {
  schemaSummary: SchemaSummaryResponse | null;
  isLoading: boolean;
  error: Error | null;
  fetchSchemaSummary: () => Promise<void>; // Optional: if manual refetch is needed
}

// 3. Create the Context
const SchemaContext = createContext<SchemaContextState | undefined>(undefined);

// 4. Create the Provider Component
interface SchemaProviderProps {
  children: ReactNode;
}

export const SchemaProvider: React.FC<SchemaProviderProps> = ({ children }) => {
  const [schemaSummary, setSchemaSummary] = useState<SchemaSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSchemaSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[SchemaContext] Fetching schema summary...');
      // Ensure apiClient is correctly configured for GET requests if it's a custom wrapper
      // Assuming apiClient.get works like axios.get or similar
      const response = await apiClient.get<SchemaSummaryResponse>('/db-management/schema-summary');
      setSchemaSummary(response.data);
      console.log('[SchemaContext] Schema summary fetched successfully:', response.data);
    } catch (err: any) {
      console.error('[SchemaContext] Error fetching schema summary:', err);
      setError(err);
      // Potentially show a notification to the user here via useNotification if critical
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemaSummary();
  }, []); // Fetch on initial mount

  const contextValue = {
    schemaSummary,
    isLoading,
    error,
    fetchSchemaSummary // Expose refetch function
  };

  return (
    <SchemaContext.Provider value={contextValue}>
      {children}
    </SchemaContext.Provider>
  );
};

// 5. Create a Custom Hook to Use the Context
export const useSchemaContext = (): SchemaContextState => {
  const context = useContext(SchemaContext);
  if (context === undefined) {
    throw new Error('useSchemaContext must be used within a SchemaProvider');
  }
  return context;
}; 