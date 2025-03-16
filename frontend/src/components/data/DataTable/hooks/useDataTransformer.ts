import { useCallback, useMemo } from 'react';
import { transformDataForDisplay } from '../../../../utils/dataTransformer';
import { StructuredData } from '../../../../types/data';

// Types for transformed data and pagination
interface TransformedData {
  headers: string[];
  rows: Record<string, any>[];
}

interface PaginatedData {
  column_order?: string[];
  rows?: Record<string, any>[];
  total?: number;
}

interface UseDataTransformerProps {
  data: StructuredData | null | undefined;
  isPaginationEnabled: boolean;
  paginatedData?: PaginatedData | null;
}

interface TableData extends TransformedData {
  total: number;
}

/**
 * Custom hook that transforms raw data into a format suitable for display in a data table
 * Handles both regular and paginated data
 */
export function useDataTransformer({
  data,
  isPaginationEnabled,
  paginatedData
}: UseDataTransformerProps): TableData {
  /**
   * Checks if data has sports-related fields or metadata
   */
  const detectSportsData = useCallback((inputData: any): boolean => {
    if (!inputData) return false;
    
    // Check metadata flag first
    if (inputData.meta_data?.data_type === 'sports-data') {
      return true;
    }
    
    // Check headers for sports-related terms
    const sportsKeywords = ['Team', 'Player', 'League', 'City', 'State', 'Stadium', 'Home Stadium'];
    return !!(inputData.data?.headers && 
      Array.isArray(inputData.data.headers) && 
      inputData.data.headers.some((header: string) => sportsKeywords.includes(header))
    );
  }, []);
  
  /**
   * Validates and normalizes a row to ensure it has an ID and all required fields
   */
  const normalizeRow = useCallback((row: any, headers: string[], index: number): Record<string, any> => {
    // Handle null or undefined rows
    if (!row) return { id: `row-${index}` };
    
    // Handle array-type rows (convert to object)
    if (Array.isArray(row)) {
      const rowObj: Record<string, any> = { id: `row-${index}` };
      headers.forEach((header, idx) => {
        rowObj[header] = idx < row.length ? row[idx] : '';
      });
      return rowObj;
    }
    
    // Ensure row has ID and all required header fields
    const safeRow: Record<string, any> = { 
      id: row.id || `row-${index}` // Ensure ID exists
    };
    
    headers.forEach(header => {
      safeRow[header] = row[header] !== undefined ? row[header] : '';
    });
    
    return safeRow;
  }, []);
  
  /**
   * Transforms the structured data to display format with error handling
   */
  const transformData = useCallback((): TransformedData => {
    // Handle missing data
    if (!data) {
      return { headers: [], rows: [] };
    }
    
    // Handle empty data object
    if (!data.data || Object.keys(data.data).length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Check for sports data format
    const isSportsData = detectSportsData(data);
    
    try {
      // Transform data using centralized utility
      const transformedData = transformDataForDisplay(data.data);
      
      // Validate transformed data structure
      if (!transformedData.headers || !Array.isArray(transformedData.rows)) {
        return { headers: [], rows: [] };
      }
      
      // Normalize each row to ensure consistent structure
      const safeRows = transformedData.rows.map((row, index) => 
        normalizeRow(row, transformedData.headers, index)
      );
      
      return {
        headers: transformedData.headers,
        rows: safeRows
      };
    } catch (error) {
      // Return empty structure in case of error
      return { headers: [], rows: [] };
    }
  }, [data, detectSportsData, normalizeRow]);

  /**
   * Select the appropriate data source (paginated or full)
   * and prepare final table data 
   */
  const tableData = useMemo((): TableData => {
    // Use paginated data when available and enabled
    if (isPaginationEnabled && paginatedData) {
      return {
        headers: paginatedData.column_order || [],
        rows: paginatedData.rows || [],
        total: paginatedData.total || 0
      };
    }
    
    // Fall back to full data transformation
    const transformedData = transformData();
    return {
      ...transformedData,
      total: transformedData.rows.length
    };
  }, [transformData, isPaginationEnabled, paginatedData]);

  return tableData;
}

export default useDataTransformer;