// We can't use the context directly in a utility function, so we'll pass notification callbacks
// from components that use these functions

/**
 * Generate CSV content from data array and visible columns
 */
export function generateCsvContent(data: any[], visibleColumns: string[]): string {
  let csvContent = '';
  
  // Add headers
  csvContent += visibleColumns.join(',') + '\n';
  
  // Add data rows
  data.forEach(entity => {
    const row = visibleColumns.map(field => {
      // Get value and format it
      let value = formatCellValue(entity, field);
      
      // Escape quotes and commas for CSV
      if (value.includes('"') || value.includes(',')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

/**
 * Format cell values for CSV export
 */
function formatCellValue(entity: any, field: string): string {
  // Get value
  const value = entity[field];
  
  // Skip if no value
  if (value === null || value === undefined) return 'N/A';
  
  // Format dates
  if (field.includes('date') && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch (e) {
      return String(value);
    }
  }
  
  // For boolean fields
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // For any other field type
  return String(value);
}

/**
 * Save data as CSV file using File System Access API with fallback
 */
export async function saveCsvFile(
  data: any[], 
  visibleColumns: string[], 
  suggestedName: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> {
  // Generate CSV content
  const csvContent = generateCsvContent(data, visibleColumns);
  
  // Create a blob for the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `${suggestedName || 'export'}.csv`;
  
  // Check if the File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      // Use modern File System Access API for OS-level save dialog
      const options = {
        suggestedName: fileName,
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] }
        }]
      };
      
      // Show OS-level save dialog
      const fileHandle = await window.showSaveFilePicker(options);
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      onSuccess?.();
      return true;
    } catch (err) {
      // User cancelled or API failed, fall back to legacy approach
      if ((err as Error).name !== 'AbortError') {
        console.error('Error using File System Access API:', err);
        // Fall back to legacy download method
        return fallbackDownload(blob, fileName);
      }
      return false; // User canceled
    }
  } else {
    // Fall back to legacy download method for browsers without File System Access API
    return fallbackDownload(blob, fileName);
  }
}

/**
 * Legacy download method as fallback
 */
function fallbackDownload(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onSuccess?.();
    return true;
  } catch (error) {
    console.error('Error with fallback download:', error);
    onError?.(error as Error);
    return false;
  }
}