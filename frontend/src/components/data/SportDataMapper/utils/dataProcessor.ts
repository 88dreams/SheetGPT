/**
 * Utility functions for processing data in the SportDataMapper component
 */

/**
 * Extract source fields from structured data
 */
export const extractSourceFields = (
  data: any,
  hookExtractSourceFields: (data: any, setValidityCallback: (isValid: boolean) => void) => void,
  setDataValidity: (isValid: boolean) => void
) => {
  console.log('DataProcessor: Extracting source fields from data:', data);
  
  // Create a properly formatted data object for the hook
  let formattedData = data;
  
  // If data is in the format {"headers": [...], "rows": [...]}
  if (data && data.headers && data.rows) {
    console.log('DataProcessor: Data has headers and rows format');
    
    // Create objects from rows using headers as keys
    if (Array.isArray(data.rows) && Array.isArray(data.headers)) {
      const processedRows = data.rows.map((row: any[]) => {
        const rowObj: Record<string, any> = {};
        data.headers.forEach((header: string, index: number) => {
          rowObj[header] = row[index];
        });
        return rowObj;
      });
      
      formattedData = {
        headers: data.headers,
        rows: processedRows
      };
      
      console.log('DataProcessor: Processed rows with headers:', processedRows);
    }
  }
  
  // Pass the formatted data to the hook
  hookExtractSourceFields(formattedData, setDataValidity);
};