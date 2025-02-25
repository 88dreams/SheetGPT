import { api } from '../utils/api'

interface ExtractedData {
  rows?: any[]
  columns?: any[]
}

export class DataExtractionService {
  /**
   * Extract structured data from a message content
   */
  static extractStructuredData(messageContent: string): ExtractedData | null {
    try {
      // Look for JSON-like structures in the message
      const jsonMatches = messageContent.match(/\{[\s\S]*?\}/g) || []
      const jsonArrayMatches = messageContent.match(/\[[\s\S]*?\]/g) || []
      
      const allMatches = [...jsonMatches, ...jsonArrayMatches]
      
      if (allMatches.length === 0) {
        return null
      }
      
      // Try to parse each match
      for (const match of allMatches) {
        try {
          const data = JSON.parse(match)
          
          // Check if this looks like our expected data format
          if (data.rows || (Array.isArray(data) && data.length > 0)) {
            return {
              rows: Array.isArray(data) ? data : data.rows,
              columns: data.columns
            }
          }
        } catch (e) {
          // Skip invalid JSON
          console.error('Failed to parse JSON:', e)
        }
      }
      
      return null
    } catch (e) {
      console.error('Error extracting data:', e)
      return null
    }
  }
  
  /**
   * Append rows to existing structured data
   * This is the single source of truth for metadata updates
   */
  static async appendRows(
    dataId: string, 
    rows: any[], 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // First, update the structured data metadata to include the name
      if (metadata) {
        try {
          const data = await api.data.getStructuredDataById(dataId);
          
          // Create a complete metadata object with all required fields
          const updatedMetadata = {
            ...(data.meta_data || {}),
            name: metadata.name || data.meta_data?.name || data.data_type,
            conversation_title: metadata.conversation_title || metadata.name || data.meta_data?.conversation_title || data.meta_data?.name || 'chat extraction',
            source: metadata.source || data.meta_data?.source || 'unknown',
            updated_at: new Date().toISOString()
          };
          
          console.log('Updating metadata with name:', updatedMetadata.name);
          console.log('Updating metadata with conversation_title:', updatedMetadata.conversation_title);
          
          // Update the structured data with the new metadata
          await api.data.updateStructuredData(dataId, {
            meta_data: updatedMetadata
          });
        } catch (error) {
          console.error('Error updating structured data metadata:', error);
          // Continue with adding rows even if metadata update fails
        }
      }
      
      // Process rows to ensure they're in the correct format before adding
      const processedRows = rows.map(row => {
        // If row already has a values property, use it as is
        if (row.values && typeof row.values === 'object') {
          return {
            values: row.values,
            _metadata: metadata || {}
          };
        }
        
        // Otherwise, create a values object from the row properties
        const values: Record<string, any> = {};
        Object.entries(row).forEach(([key, value]) => {
          // Skip internal properties
          if (!key.startsWith('_') && key !== 'id') {
            values[key] = value;
          }
        });
        
        return {
          values,
          _metadata: metadata || {}
        };
      });
      
      console.log('DataExtractionService: Processed rows for appending:', processedRows);
      
      // Check if we have any rows to add
      if (processedRows.length === 0) {
        console.warn('DataExtractionService: No rows to append after processing');
        return false;
      }
      
      // Get the current data to check its structure
      try {
        const currentData = await api.data.getStructuredDataById(dataId);
        console.log('DataExtractionService: Current data structure:', {
          id: currentData.id,
          dataType: currentData.data_type,
          hasData: !!currentData.data,
          dataKeys: currentData.data ? Object.keys(currentData.data) : []
        });
        
        // If the data is empty, we need to initialize it with a proper structure
        if (!currentData.data || Object.keys(currentData.data).length === 0) {
          console.log('DataExtractionService: Initializing empty data structure');
          
          // Create a basic structure with rows
          const initialData = {
            rows: processedRows.map(row => row.values)
          };
          
          // Update the structured data with the initial structure
          await api.data.updateStructuredData(dataId, {
            data: initialData
          });
          
          return true;
        }
      } catch (error) {
        console.error('DataExtractionService: Error checking current data structure:', error);
        // Continue with adding rows even if checking fails
      }
      
      // Add each processed row to the structured data
      for (const row of processedRows) {
        await api.data.addRow(dataId, row);
      }
      
      return true;
    } catch (e) {
      console.error('Error appending rows:', e);
      return false;
    }
  }
  
  /**
   * Add new columns to existing structured data
   */
  static async addColumns(dataId: string, columns: any[]): Promise<boolean> {
    try {
      // This would need to be implemented in your API
      // For now, we'll just log that this would happen
      console.log('Would add columns to data', dataId, columns)
      return true
    } catch (e) {
      console.error('Error adding columns:', e)
      return false
    }
  }
  
  /**
   * Transform data from various formats to a standard row format
   * Handles Google Sheets format and other common formats
   */
  static transformToRowFormat(data: any): any[] {
    console.log('DataExtractionService: transformToRowFormat input:', {
      type: typeof data,
      isArray: Array.isArray(data),
      hasRows: data?.rows !== undefined,
      hasHeaders: data?.headers !== undefined,
      keys: typeof data === 'object' ? Object.keys(data) : []
    });
    
    // If data is already an array of objects, return it
    if (Array.isArray(data) && typeof data[0] === 'object') {
      console.log('DataExtractionService: Data is already an array of objects');
      const result = data.map(item => {
        // Filter out internal properties
        const cleanItem: Record<string, any> = {};
        Object.entries(item).forEach(([key, value]) => {
          if (!key.startsWith('_') && key !== 'id') {
            cleanItem[key] = value;
          }
        });
        return cleanItem;
      });
      console.log('DataExtractionService: Transformed array result:', result);
      return result;
    }
    
    // Handle the common format from AI responses with headers and rows arrays
    if (data && data.headers && Array.isArray(data.headers) && data.rows && Array.isArray(data.rows)) {
      const headers = data.headers;
      console.log('DataExtractionService: Found headers and rows format', { 
        headers, 
        rowsType: typeof data.rows[0],
        isRowsArray: Array.isArray(data.rows[0])
      });
      
      // Check if rows are arrays of values (row-oriented format)
      if (Array.isArray(data.rows[0])) {
        const result = data.rows.map((row) => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header: string, index: number) => {
            rowObj[header] = row[index] || '';
          });
          return rowObj;
        });
        console.log('DataExtractionService: Transformed row-oriented data:', result);
        return result;
      }
      
      // If rows are already objects
      if (typeof data.rows[0] === 'object') {
        console.log('DataExtractionService: Rows are already objects:', data.rows);
        return data.rows;
      }
    }
    
    // If data has a special "Table Data" format with headers and rows
    if (data.rows && Array.isArray(data.rows) && data.rows[0]?.headers) {
      console.log('DataExtractionService: Found Table Data format with headers in rows');
      const headers: string[] = []
      data.rows.forEach((item: any) => {
        if (item.headers) {
          headers.push(item.headers)
        }
      })
      
      const numItems = data.rows[0]?.rows?.length || 0
      if (numItems === 0) {
        console.log('DataExtractionService: No items found in Table Data format');
        return []
      }
      
      const transformedRows: Record<string, any>[] = []
      
      for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
        const row: Record<string, any> = {}
        
        data.rows.forEach((column: any, columnIndex: number) => {
          const headerName = column.headers || `Column${columnIndex + 1}`
          row[headerName] = column.rows?.[itemIndex] || ''
        })
        
        transformedRows.push(row)
      }
      
      console.log('DataExtractionService: Transformed Table Data format:', transformedRows);
      return transformedRows
    }
    
    // If it's a column-based format (Google Sheets format)
    if (typeof data === 'object' && !Array.isArray(data)) {
      console.log('DataExtractionService: Trying to handle column-based format');
      const columnNames = Object.keys(data).filter(key => !key.startsWith('_'));
      if (columnNames.length === 0) {
        console.log('DataExtractionService: No column names found in object');
        return [];
      }
      
      // Find the first array to determine row count
      let rowCount = 0;
      for (const key of columnNames) {
        if (Array.isArray(data[key])) {
          rowCount = Math.max(rowCount, data[key].length);
        }
      }
      
      if (rowCount === 0) {
        console.log('DataExtractionService: No rows found in column-based format');
        return [];
      }
      
      const rows: Record<string, any>[] = [];
      
      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, any> = {};
        for (const column of columnNames) {
          if (Array.isArray(data[column]) && i < data[column].length) {
            row[column] = data[column][i];
          } else {
            row[column] = '';
          }
        }
        rows.push(row);
      }
      
      console.log('DataExtractionService: Transformed column-based format:', rows);
      return rows;
    }
    
    console.warn('DataExtractionService: Could not transform data, returning empty array', data);
    return [];
  }
} 