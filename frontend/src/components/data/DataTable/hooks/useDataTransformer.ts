import { useMemo } from 'react';
import { transformDataForDisplay, RowObjectsFormat } from '../../../../utils/dataTransformer';
import { StructuredData } from '../../../../types/data';

/**
 * Interface for paginated data from the API
 */
interface PaginatedData {
  column_order?: string[];
  rows?: Record<string, any>[];
  total?: number;
}

/**
 * Properties for the useDataTransformer hook
 */
interface UseDataTransformerProps {
  data: StructuredData | null | undefined;
  isPaginationEnabled: boolean;
  paginatedData?: PaginatedData | null;
}

/**
 * Table data with total count for pagination
 */
interface TableData extends RowObjectsFormat {
  total: number;
}

/**
 * Custom hook that transforms raw data into a format suitable for display in a data table
 * Handles both regular and paginated data sources, with appropriate error handling
 * 
 * @param data - The source data to transform
 * @param isPaginationEnabled - Whether pagination is enabled
 * @param paginatedData - Pre-paginated data from the API (when pagination is enabled)
 * @returns Transformed data ready for display in a table
 */
export function useDataTransformer({
  data,
  isPaginationEnabled,
  paginatedData
}: UseDataTransformerProps): TableData {
  /**
   * Transform the full dataset (used when pagination is disabled)
   */
  const transformedData = useMemo((): RowObjectsFormat => {
    // Handle missing or empty data
    if (!data?.data || Object.keys(data.data).length === 0) {
      return { headers: [], rows: [] };
    }
    
    try {
      // Use the centralized data transformer utility
      return transformDataForDisplay(data.data);
    } catch (error) {
      // Return empty structure in case of error
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDataTransformer] Error transforming data:', error);
      }
      return { headers: [], rows: [] };
    }
  }, [data, process.env.NODE_ENV]);

  /**
   * Select the appropriate data source (paginated or full)
   * and prepare final table data
   */
  const tableData = useMemo((): TableData => {
    // Use server-paginated data when available and enabled
    if (isPaginationEnabled && paginatedData) {
      return {
        headers: paginatedData.column_order || [],
        rows: paginatedData.rows || [],
        total: paginatedData.total || 0
      };
    }
    
    // Otherwise use locally transformed data
    return {
      ...transformedData,
      total: transformedData.rows.length
    };
  }, [transformedData, isPaginationEnabled, paginatedData]);

  return tableData;
}

export default useDataTransformer;