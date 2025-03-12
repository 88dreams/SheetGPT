import { useCallback, useMemo } from 'react';
import { transformDataForDisplay } from '../../../../utils/dataTransformer';
import { StructuredData } from '../../../../types/data';

interface UseDataTransformerProps {
  data: StructuredData | null | undefined;
  isPaginationEnabled: boolean;
  paginatedData?: {
    column_order?: string[];
    rows?: Record<string, any>[];
    total?: number;
  } | null;
}

export function useDataTransformer({
  data,
  isPaginationEnabled,
  paginatedData
}: UseDataTransformerProps) {
  // Transform the data for display
  const transformData = useCallback(() => {
    if (!data) {
      console.error('DataTable: No data available');
      return { headers: [], rows: [] };
    }
    
    console.log('DataTable: Processing data for display', {
      id: data.id,
      dataType: data.data_type,
      metaData: data.meta_data
    });
    
    // Handle empty data
    if (!data.data || Object.keys(data.data).length === 0) {
      console.error('DataTable: Data is empty');
      return { headers: [], rows: [] };
    }
    
    // Check if this is sports data based on metadata or headers
    const isSportsData = 
      (data.meta_data?.data_type === 'sports-data') || 
      (data.data.headers && Array.isArray(data.data.headers) && 
       data.data.headers.some((header: string) => 
         ['Team', 'Player', 'League', 'City', 'State', 'Stadium', 'Home Stadium'].includes(header)
       ));
    
    if (isSportsData) {
      console.log('DataTable: Detected sports data format - ensuring proper display');
    }
    
    // Use the centralized data transformer for all formats
    // The transformer will handle all data formats including transposition if needed
    try {
      const transformedData = transformDataForDisplay(data.data);
      
      // Validate the transformed data
      if (!transformedData.headers || !transformedData.rows) {
        console.error('DataTable: Invalid transformed data structure - missing headers or rows');
        return { headers: [], rows: [] };
      }
      
      // Validate that each row has data for each header
      const safeRows = transformedData.rows.map(row => {
        if (!row) return {};
        
        // If row is an array (legacy format), convert it to object with header keys
        if (Array.isArray(row)) {
          const rowObj: Record<string, any> = {};
          transformedData.headers.forEach((header, idx) => {
            rowObj[header] = idx < row.length ? row[idx] : '';
          });
          return rowObj;
        }
        
        // Ensure all headers are present in the row object
        const safeRow: Record<string, any> = {};
        transformedData.headers.forEach(header => {
          safeRow[header] = row[header] !== undefined ? row[header] : '';
        });
        
        return safeRow;
      });
      
      console.log('DataTable: Data transformation complete', {
        headers: transformedData.headers,
        rowCount: safeRows.length
      });
      
      return {
        headers: transformedData.headers,
        rows: safeRows
      };
    } catch (error) {
      console.error('DataTable: Error transforming data:', error);
      // Return empty data structure
      return { headers: [], rows: [] };
    }
  }, [data]);

  // Get transformed data based on whether pagination is enabled
  const tableData = useMemo(() => {
    // If pagination is enabled and we have paginated data, use that
    if (isPaginationEnabled && paginatedData) {
      const columnOrder = paginatedData.column_order || [];
      return {
        headers: columnOrder,
        rows: paginatedData.rows || [],
        total: paginatedData.total || 0
      };
    }
    
    // Otherwise use the full data
    const transformedData = transformData();
    return {
      ...transformedData,
      total: transformedData.rows.length
    };
  }, [transformData, isPaginationEnabled, paginatedData]);

  return tableData;
}

export default useDataTransformer;