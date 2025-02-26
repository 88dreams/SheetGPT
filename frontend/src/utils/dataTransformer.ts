/**
 * Data Transformer Utility
 * 
 * This utility provides standardized functions for transforming data between different formats.
 * It serves as the single source of truth for all data transformations in the application.
 */

/**
 * Standard data format used throughout the application
 */
export interface StandardDataFormat {
  headers: string[];
  rows: any[][];
}

/**
 * Row objects format used for display in data grids
 */
export interface RowObjectsFormat {
  headers: string[];
  rows: Record<string, any>[];
}

/**
 * Transforms any data structure into a standardized format with headers and rows
 * @param data The data to transform
 * @returns An object with headers and rows arrays
 */
export function transformToStandardFormat(data: any): StandardDataFormat {
  console.log('DataTransformer: Starting transformation to standard format', data);
  
  if (!data) {
    console.error('DataTransformer: No data to transform');
    return { headers: [], rows: [] };
  }
  
  // Case 0: Handle data with column_order and rows in the database format
  if (data.column_order && Array.isArray(data.column_order) && 
      data.rows && Array.isArray(data.rows)) {
    console.log('DataTransformer: Detected database format with column_order and rows');
    
    // Check if rows are objects with properties
    if (data.rows.length > 0 && typeof data.rows[0] === 'object' && !Array.isArray(data.rows[0])) {
      console.log('DataTransformer: Converting rows objects to 2D array using column_order');
      
      const headers = [...data.column_order];
      const rows = data.rows.map((row: any) => {
        return headers.map((header: string) => {
          return row[header] !== undefined ? row[header] : '';
        });
      });
      
      return { headers, rows };
    }
  }
  
  // Special case: Handle data with column_order metadata that shouldn't be displayed
  if (data.column_order && 
      Array.isArray(data.column_order) && 
      data.column_order.includes('headers') && 
      data.column_order.includes('rows')) {
    console.log('DataTransformer: Detected column_order metadata that should not be displayed directly');
    
    // If we have rows data, use that instead
    if (data.rows && Array.isArray(data.rows)) {
      console.log('DataTransformer: Using rows data instead of column_order');
      return transformToStandardFormat(data.rows);
    }
  }
  
  // Case 1: Data already has headers and rows arrays in the expected format
  if (data.headers && Array.isArray(data.headers) && 
      data.rows && Array.isArray(data.rows)) {
    
    console.log('DataTransformer: Found standard headers and rows format');
    
    // If rows is already a 2D array
    if (data.rows.length > 0 && Array.isArray(data.rows[0])) {
      console.log('DataTransformer: Rows are in 2D array format');
      
      // Special case for sports data: Check if headers contain typical sports entity fields
      const sportDataHeaders = ['Team', 'Player', 'League', 'City', 'State', 'Stadium', 'Home Stadium'];
      const isSportsData = data.headers.some(header => sportDataHeaders.includes(header));
      
      if (isSportsData) {
        console.log('DataTransformer: Detected sports data - preserving original format');
        return { 
          headers: [...data.headers], 
          rows: [...data.rows] 
        };
      }
      
      // Check if data needs to be transposed
      // More robust check: If the number of rows matches the number of headers, 
      // AND each row has the same number of items as there are rows,
      // AND we don't have typical entity data (like teams, players, etc.)
      // then the data is likely in the wrong orientation
      if (data.rows.length === data.headers.length && 
          data.rows[0].length === data.rows.length && 
          !isSportsData) {
        console.log('DataTransformer: Data appears to be in wrong orientation - transposing');
        
        // Create transposed rows where each row represents a complete record
        const transposedRows: any[][] = [];
        
        // For each item in the first row (which will become the number of new rows)
        for (let i = 0; i < data.rows[0].length; i++) {
          const newRow: any[] = [];
          
          // For each original row (which will become columns in the new structure)
          for (let j = 0; j < data.rows.length; j++) {
            newRow.push(data.rows[j][i]);
          }
          
          transposedRows.push(newRow);
        }
        
        return {
          headers: [...data.headers],
          rows: transposedRows
        };
      }
      
      // Otherwise, use the data as is
      return { 
        headers: [...data.headers], 
        rows: [...data.rows] 
      };
    }
    
    // If rows are objects with properties matching headers
    if (data.rows.length > 0 && typeof data.rows[0] === 'object' && !Array.isArray(data.rows[0])) {
      console.log('DataTransformer: Rows are objects - converting to 2D array');
      const rows = data.rows.map((row: any) => {
        return data.headers.map((header: string) => {
          return row[header] !== undefined ? row[header] : '';
        });
      });
      
      return { headers: [...data.headers], rows };
    }
  }
  
  // Case 2: Data is an array of objects (flat objects)
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    console.log('DataTransformer: Data is an array of objects');
    
    // Extract headers from the first object
    const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
    
    // Convert objects to arrays of values
    const rows = data.map(item => {
      return headers.map(header => {
        return item[header] !== undefined ? item[header] : '';
      });
    });
    
    return { headers, rows };
  }
  
  // Case 3: Data has columns array (column-oriented format)
  if (data.columns && Array.isArray(data.columns) && data.columns.length > 0) {
    console.log('DataTransformer: Data has columns array (column-oriented format)');
    
    const headers = data.columns.map((col: any) => col.header || `Column ${col.index || 0}`);
    
    // Find the maximum length of any column
    const maxLength = Math.max(...data.columns.map((col: any) => 
      Array.isArray(col.values) ? col.values.length : 0
    ));
    
    // Create rows from columns
    const rows: any[][] = [];
    for (let i = 0; i < maxLength; i++) {
      const row: any[] = [];
      data.columns.forEach((col: any) => {
        row.push(col.values && col.values[i] !== undefined ? col.values[i] : '');
      });
      rows.push(row);
    }
    
    return { headers, rows };
  }
  
  // Case 4: Data is a single object
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    console.log('DataTransformer: Data is a single object');
    
    const keys = Object.keys(data).filter(key => 
      !key.startsWith('_') && key !== 'headers' && key !== 'rows' && key !== 'columns'
    );
    
    if (keys.length > 0) {
      const headers = keys;
      // Create a single row with values
      const row = keys.map(key => data[key] !== undefined ? data[key] : '');
      
      return { headers, rows: [row] };
    }
  }
  
  // Case 5: Data is a string (attempt to parse as JSON)
  if (typeof data === 'string') {
    console.log('DataTransformer: Data is a string, attempting to parse as JSON');
    try {
      const parsedData = JSON.parse(data);
      return transformToStandardFormat(parsedData);
    } catch (e) {
      console.error('DataTransformer: Failed to parse string as JSON', e);
      // If it's a simple string, create a basic structure
      return {
        headers: ['Value'],
        rows: [[data]]
      };
    }
  }
  
  console.error('DataTransformer: Could not transform data to standard format');
  return { headers: [], rows: [] };
}

/**
 * Transforms standardized data format into row objects for display in a data grid
 * @param data The standardized data with headers and rows
 * @returns An object with headers array and rows array of objects
 */
export function transformToRowObjects(data: StandardDataFormat): RowObjectsFormat {
  console.log('DataTransformer: Transforming standard format to row objects');
  
  const { headers, rows } = data;
  
  if (!headers || !rows || headers.length === 0) {
    console.error('DataTransformer: Invalid input for transformToRowObjects');
    return { headers: [], rows: [] };
  }
  
  // Convert 2D array to array of objects
  const rowObjects = rows.map((row, rowIndex) => {
    const obj: Record<string, any> = { '#': rowIndex + 1 };
    
    headers.forEach((header, index) => {
      if (index < row.length) {
        obj[header] = row[index] !== undefined ? row[index] : '';
      } else {
        obj[header] = '';
      }
    });
    
    return obj;
  });
  
  console.log('DataTransformer: Successfully transformed to row objects');
  
  return { headers, rows: rowObjects };
}

/**
 * One-step transformation from any data format to row objects for display
 * This is the primary function that should be used by display components
 * @param data The data in any format
 * @returns An object with headers array and rows array of objects
 */
export function transformDataForDisplay(data: any): RowObjectsFormat {
  console.log('DataTransformer: Starting one-step transformation for display');
  
  if (!data) {
    console.error('DataTransformer: No data for transformation');
    return { headers: [], rows: [] };
  }
  
  // First standardize the format
  const standardFormat = transformToStandardFormat(data);
  
  // Then convert to row objects
  return transformToRowObjects(standardFormat);
}

// Legacy function name for backward compatibility
export const transformNestedToRowObjects = transformDataForDisplay; 