/**
 * Data Transformer Utility
 * 
 * This utility provides standardized functions for transforming data between different formats.
 * It serves as the single source of truth for all data transformations in the application.
 */

// Enable debug logs in development only
const isDevMode = process.env.NODE_ENV === 'development';
const logDebug = (message: string, data?: any) => {
  if (isDevMode) {
    console.log(`[DataTransformer] ${message}`, data);
  }
};

// Known data formats
export enum DataFormat {
  DATABASE = 'database',
  STANDARD = 'standard',
  ARRAY_OF_OBJECTS = 'array_of_objects',
  COLUMN_ORIENTED = 'column_oriented',
  SINGLE_OBJECT = 'single_object',
  JSON_STRING = 'json_string',
  UNKNOWN = 'unknown'
}

// Special data types that need custom handling
export enum DataType {
  SPORTS = 'sports',
  STANDARD = 'standard',
  TRANSPOSED = 'transposed'
}

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
 * Detects the format of input data
 */
function detectDataFormat(data: any): DataFormat {
  if (!data) {
    return DataFormat.UNKNOWN;
  }
  
  // Database format with column_order and rows
  if (data.column_order && Array.isArray(data.column_order) && 
      data.rows && Array.isArray(data.rows)) {
    return DataFormat.DATABASE;
  }
  
  // Standard headers and rows format
  if (data.headers && Array.isArray(data.headers) && 
      data.rows && Array.isArray(data.rows)) {
    return DataFormat.STANDARD;
  }
  
  // Array of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    return DataFormat.ARRAY_OF_OBJECTS;
  }
  
  // Column-oriented format
  if (data.columns && Array.isArray(data.columns) && data.columns.length > 0) {
    return DataFormat.COLUMN_ORIENTED;
  }
  
  // Single object
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return DataFormat.SINGLE_OBJECT;
  }
  
  // JSON string
  if (typeof data === 'string') {
    try {
      JSON.parse(data);
      return DataFormat.JSON_STRING;
    } catch (e) {
      // Not valid JSON
      return DataFormat.UNKNOWN;
    }
  }
  
  return DataFormat.UNKNOWN;
}

/**
 * Detects if data is sports-related
 */
function detectSportsData(data: any): boolean {
  // Check for sports-related headers
  const sportDataHeaders = ['Team', 'Player', 'League', 'City', 'State', 'Stadium', 'Home Stadium'];
  
  if (data?.headers && Array.isArray(data.headers)) {
    return data.headers.some((header: string) => sportDataHeaders.includes(header));
  }
  
  // Check metadata flag
  if (data?.meta_data?.data_type === 'sports-data') {
    return true;
  }
  
  return false;
}

/**
 * Detects if data needs to be transposed
 */
function needsTransposing(data: any): boolean {
  if (!data?.headers || !data?.rows || !Array.isArray(data.headers) || !Array.isArray(data.rows)) {
    return false;
  }
  
  // If empty, no transposition needed
  if (data.rows.length === 0) {
    return false;
  }
  
  // Don't transpose sports data
  if (detectSportsData(data)) {
    return false;
  }
  
  // Check if data is in the wrong orientation:
  // 1. Number of rows matches number of headers
  // 2. Each row has same number of items as rows (square matrix)
  if (data.rows.length === data.headers.length && 
      Array.isArray(data.rows[0]) && 
      data.rows[0].length === data.rows.length) {
    return true;
  }
  
  return false;
}

/**
 * Transforms database format data to standard format
 */
function transformDatabaseFormat(data: any): StandardDataFormat {
  const headers = [...data.column_order];
  
  // If rows are objects, convert to 2D array
  if (data.rows.length > 0 && typeof data.rows[0] === 'object' && !Array.isArray(data.rows[0])) {
    const rows = data.rows.map((row: any) => {
      return headers.map((header: string) => row[header] !== undefined ? row[header] : '');
    });
    return { headers, rows };
  }
  
  // Handle special case where column_order shouldn't be displayed
  if (headers.includes('headers') && headers.includes('rows') && data.rows && Array.isArray(data.rows)) {
    return transformToStandardFormat(data.rows);
  }
  
  return { headers, rows: data.rows };
}

/**
 * Transforms standard format data, handling transposition if needed
 */
function transformStandardFormat(data: any): StandardDataFormat {
  const headers = [...data.headers];
  
  // If rows is already a 2D array
  if (data.rows.length > 0 && Array.isArray(data.rows[0])) {
    // Check if transposition is needed
    if (needsTransposing(data)) {
      // Create transposed rows
      const transposedRows: any[][] = [];
      for (let i = 0; i < data.rows[0].length; i++) {
        const newRow: any[] = [];
        for (let j = 0; j < data.rows.length; j++) {
          newRow.push(data.rows[j][i]);
        }
        transposedRows.push(newRow);
      }
      return { headers, rows: transposedRows };
    }
    
    // Use the data as is
    return { headers, rows: [...data.rows] };
  }
  
  // If rows are objects, convert to 2D array
  if (data.rows.length > 0 && typeof data.rows[0] === 'object' && !Array.isArray(data.rows[0])) {
    const rows = data.rows.map((row: any) => {
      return headers.map((header: string) => row[header] !== undefined ? row[header] : '');
    });
    return { headers, rows };
  }
  
  return { headers, rows: [] };
}

/**
 * Transforms array of objects to standard format
 */
function transformArrayOfObjects(data: any[]): StandardDataFormat {
  // Extract headers from the first object
  const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
  
  // Convert objects to arrays of values
  const rows = data.map(item => {
    return headers.map(header => item[header] !== undefined ? item[header] : '');
  });
  
  return { headers, rows };
}

/**
 * Transforms column-oriented data to standard format
 */
function transformColumnOrientedData(data: any): StandardDataFormat {
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

/**
 * Transforms a single object to standard format
 */
function transformSingleObject(data: any): StandardDataFormat {
  const keys = Object.keys(data).filter(key => 
    !key.startsWith('_') && key !== 'headers' && key !== 'rows' && key !== 'columns'
  );
  
  if (keys.length > 0) {
    const headers = keys;
    const row = keys.map(key => data[key] !== undefined ? data[key] : '');
    return { headers, rows: [row] };
  }
  
  return { headers: [], rows: [] };
}

/**
 * Creates row objects with unique IDs from a 2D array
 */
function createRowObjects(headers: string[], rows: any[][]): Record<string, any>[] {
  return rows.map((row, rowIndex) => {
    // Start with a guaranteed unique ID
    const obj: Record<string, any> = { 
      id: `row-${rowIndex}`,  // Ensure every row has a unique ID
      '#': rowIndex + 1       // Legacy row number support
    };
    
    // Map each header to its value
    headers.forEach((header, index) => {
      obj[header] = index < row.length ? (row[index] !== undefined ? row[index] : '') : '';
    });
    
    return obj;
  });
}

/**
 * Process the "Send to Data" button format
 */
function processSendToDataFormat(data: any): RowObjectsFormat {
  const headers = [...data.column_order];
  let rowData = data.rows;
  
  // Add unique row IDs
  if (rowData.length > 0) {
    rowData = rowData.map((row: any, index: number) => {
      // Handle various row formats
      if (typeof row === 'object' && !Array.isArray(row)) {
        return { id: `row-${index}`, ...row };
      }
      
      if (Array.isArray(row)) {
        const rowObj: Record<string, any> = { id: `row-${index}` };
        headers.forEach((header: string, idx: number) => {
          rowObj[header] = idx < row.length ? row[idx] : '';
        });
        return rowObj;
      }
      
      return { id: `row-${index}`, value: row };
    });
  }
  
  return { headers, rows: rowData };
}

/**
 * Transforms any data structure into a standardized format with headers and rows
 * @param data The data to transform
 * @returns An object with headers and rows arrays
 */
export function transformToStandardFormat(data: any): StandardDataFormat {
  if (!data) {
    return { headers: [], rows: [] };
  }
  
  // Detect data format
  const format = detectDataFormat(data);
  logDebug(`Detected format: ${format}`);
  
  switch (format) {
    case DataFormat.DATABASE:
      return transformDatabaseFormat(data);
      
    case DataFormat.STANDARD:
      return transformStandardFormat(data);
      
    case DataFormat.ARRAY_OF_OBJECTS:
      return transformArrayOfObjects(data);
      
    case DataFormat.COLUMN_ORIENTED:
      return transformColumnOrientedData(data);
      
    case DataFormat.SINGLE_OBJECT:
      return transformSingleObject(data);
      
    case DataFormat.JSON_STRING:
      try {
        const parsedData = JSON.parse(data);
        return transformToStandardFormat(parsedData);
      } catch (e) {
        // If parsing fails, treat as a simple string
        return { headers: ['Value'], rows: [[data]] };
      }
      
    default:
      // Unknown format - return empty structure
      return { headers: [], rows: [] };
  }
}

/**
 * Transforms standardized data format into row objects for display in a data grid
 * @param data The standardized data with headers and rows
 * @returns An object with headers array and rows array of objects
 */
export function transformToRowObjects(data: StandardDataFormat): RowObjectsFormat {
  const { headers, rows } = data;
  
  if (!headers || !rows || headers.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Convert 2D array to array of objects with guaranteed IDs
  const rowObjects = createRowObjects(headers, rows);
  
  return { headers, rows: rowObjects };
}

/**
 * One-step transformation from any data format to row objects for display
 * This is the primary function that should be used by display components
 * 
 * @param data The data in any format
 * @returns An object with headers array and rows array of objects
 */
export function transformDataForDisplay(data: any): RowObjectsFormat {
  logDebug('Starting transformation for display');
  
  if (!data) {
    return { headers: [], rows: [] };
  }
  
  try {
    // Check for "Send to Data" button format first
    if (data.rows && data.column_order && Array.isArray(data.column_order) && Array.isArray(data.rows)) {
      return processSendToDataFormat(data);
    }
    
    // Standard transformation path
    const standardFormat = transformToStandardFormat(data);
    const rowObjects = transformToRowObjects(standardFormat);
    
    // Ensure all rows have IDs
    const rowsWithIds = rowObjects.rows.map((row, index) => {
      if (!row.id) {
        return { id: `row-${index}`, ...row };
      }
      return row;
    });
    
    return {
      headers: rowObjects.headers,
      rows: rowsWithIds
    };
  } catch (error) {
    logDebug('Error during transformation', error);
    return { headers: [], rows: [] };
  }
}

// Legacy function name for backward compatibility
export const transformNestedToRowObjects = transformDataForDisplay; 