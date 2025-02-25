import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import LoadingSpinner from '../common/LoadingSpinner'
// @ts-ignore
import { FaEye, FaEyeSlash, FaFileExport } from 'react-icons/fa'
import ExportDialog from './ExportDialog'

interface DataTableProps {
  dataId: string
}

const DataTable: React.FC<DataTableProps> = ({ dataId }) => {
  const [showHeaders, setShowHeaders] = useState(true)
  const [showRowNumbers, setShowRowNumbers] = useState(true)
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  // Get the data for the given data ID
  const { data, isLoading, error } = useQuery({
    queryKey: ['structured-data', dataId],
    queryFn: () => api.data.getStructuredDataById(dataId),
  })

  // Transform the data for display
  const transformData = useCallback(() => {
    if (!data?.data) {
      console.error('DataTable: No data or data.data available', { data });
      return { headers: [], rows: [] }
    }
    
    console.log('DataTable: Raw data structure:', JSON.stringify(data.data, null, 2));
    console.log('DataTable: Full data object:', {
      id: data.id,
      data_type: data.data_type,
      meta_data: data.meta_data,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    
    // Check if data.data is empty
    if (Object.keys(data.data).length === 0) {
      console.error('DataTable: data.data is empty');
      return { headers: [], rows: [] };
    }

    // SIMPLIFIED APPROACH: Focus on the most common format first
    // This is the format we're standardizing on in MessageThread.tsx
    if (data.data.headers && Array.isArray(data.data.headers) && 
        data.data.rows && Array.isArray(data.data.rows)) {
      
      const headers = data.data.headers;
      console.log('DataTable: Found headers and rows format', { 
        headers, 
        rowsCount: data.data.rows.length,
        rowsType: data.data.rows.length > 0 ? typeof data.data.rows[0] : 'empty',
        isArray: data.data.rows.length > 0 ? Array.isArray(data.data.rows[0]) : false
      });
      
      // If rows is a 2D array (array of arrays), transform it to array of objects
      if (data.data.rows.length > 0 && Array.isArray(data.data.rows[0])) {
        const transformedRows = data.data.rows.map(row => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header: string, index: number) => {
            rowObj[header] = row[index] !== undefined ? row[index] : '';
          });
          return rowObj;
        });
        
        console.log('DataTable: Transformed 2D array data', {
          sample: transformedRows.length > 0 ? transformedRows[0] : 'empty'
        });
        return { headers, rows: transformedRows };
      }
      
      // If rows are already objects but we need to ensure they have all headers
      if (data.data.rows.length > 0 && typeof data.data.rows[0] === 'object') {
        const transformedRows = data.data.rows.map(row => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header: string) => {
            rowObj[header] = row[header] !== undefined ? row[header] : '';
          });
          return rowObj;
        });
        
        console.log('DataTable: Normalized row objects', {
          sample: transformedRows.length > 0 ? transformedRows[0] : 'empty'
        });
        return { headers, rows: transformedRows };
      }
      
      // If we have headers but empty rows, return empty rows
      console.log('DataTable: Headers found but no valid rows');
      return { headers, rows: [] };
    }
    
    // Special case: Handle the nested structure we're seeing in the NFL teams data
    // This is where data.data.rows is an array of objects, each with its own headers and rows properties
    if (data.data.rows && Array.isArray(data.data.rows) && 
        data.data.rows.length > 0 && typeof data.data.rows[0] === 'object' &&
        data.data.rows[0].headers && data.data.rows[0].rows) {
      
      console.log('DataTable: Detected nested structure with rows containing headers/rows');
      
      // Extract all unique headers from the nested structure
      const headers: string[] = [];
      data.data.rows.forEach((item: any) => {
        if (item.headers && !headers.includes(item.headers)) {
          headers.push(item.headers);
        }
      });
      
      console.log('DataTable: Extracted headers from nested structure:', headers);
      
      // Find the maximum length of any rows array
      let maxRowLength = 0;
      data.data.rows.forEach((item: any) => {
        if (Array.isArray(item.rows)) {
          maxRowLength = Math.max(maxRowLength, item.rows.length);
        }
      });
      
      // Create rows as objects with header keys
      const transformedRows: Record<string, any>[] = [];
      for (let i = 0; i < maxRowLength; i++) {
        const rowObj: Record<string, any> = {};
        headers.forEach(header => {
          // Find the item with this header
          const item = data.data.rows.find((r: any) => r.headers === header);
          // Get the value at this index, or empty string if not available
          rowObj[header] = item && Array.isArray(item.rows) && i < item.rows.length 
            ? item.rows[i] 
            : '';
        });
        transformedRows.push(rowObj);
      }
      
      console.log('DataTable: Created rows from nested structure:', {
        headers,
        rowCount: transformedRows.length,
        sample: transformedRows.length > 0 ? transformedRows[0] : 'empty'
      });
      
      return { headers, rows: transformedRows };
    }
    
    // FALLBACK: Try to extract any meaningful structure
    console.warn('DataTable: Using fallback data extraction - data format not recognized');
    
    // Case 1: If data.data itself is an array of objects (each object is a row)
    if (Array.isArray(data.data)) {
      if (data.data.length > 0 && typeof data.data[0] === 'object') {
        // Extract headers from the first object's keys
        const headers = Object.keys(data.data[0]).filter(key => !key.startsWith('_'));
        console.log('DataTable: Extracted headers from array data', headers);
        return { headers, rows: data.data };
      }
    }
    
    // Case 2: If data.data has properties that could be columns
    if (typeof data.data === 'object' && !Array.isArray(data.data)) {
      const keys = Object.keys(data.data).filter(key => 
        !key.startsWith('_') && key !== 'rows' && key !== 'headers'
      );
      
      if (keys.length > 0) {
        console.log('DataTable: Found object with properties, treating as columns', keys);
        
        // Check if any properties are arrays (potential columns)
        const columnsData: Record<string, any[]> = {};
        let maxLength = 0;
        
        keys.forEach(key => {
          if (Array.isArray(data.data[key])) {
            columnsData[key] = data.data[key];
            maxLength = Math.max(maxLength, data.data[key].length);
          } else {
            // If it's not an array, treat it as a single value
            columnsData[key] = [data.data[key]];
            maxLength = Math.max(maxLength, 1);
          }
        });
        
        if (Object.keys(columnsData).length > 0 && maxLength > 0) {
          // Create rows from columns
          const headers = Object.keys(columnsData);
          const rows: Record<string, any>[] = [];
          
          for (let i = 0; i < maxLength; i++) {
            const row: Record<string, any> = {};
            headers.forEach(header => {
              row[header] = i < columnsData[header].length ? columnsData[header][i] : '';
            });
            rows.push(row);
          }
          
          console.log('DataTable: Created rows from column data', { 
            headers, 
            rowCount: rows.length,
            sample: rows.length > 0 ? rows[0] : 'empty'
          });
          return { headers, rows };
        }
      }
    }
    
    console.warn('DataTable: Could not transform data, returning empty structure');
    return { headers: [], rows: [] };
  }, [data]);

  // Get transformed data
  const { headers = [], rows = [] } = useMemo(() => transformData(), [transformData]);

  useEffect(() => {
    if (data?.data) {
      console.log('DataTable: Data structure details:', {
        hasData: !!data,
        dataId: dataId,
        dataType: data?.data_type,
        dataFormat: typeof data.data,
        dataKeys: Object.keys(data.data),
        hasHeaders: !!data.data.headers,
        hasRows: !!data.data.rows,
        transformedHeaders: headers,
        transformedRowsCount: rows.length
      });
    } else {
      console.error('DataTable: No data available for ID:', dataId);
    }
  }, [data, headers, rows, dataId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    console.error('DataTable: Error loading data:', error);
    return (
      <div className="text-red-600 py-4">
        Failed to load data. Please try again.
      </div>
    )
  }

  if (!data) {
    console.error('DataTable: No data returned from API for ID:', dataId);
    return (
      <div className="text-red-600 py-4">
        No data found for the selected item.
      </div>
    )
  }
  
  if (!headers.length || !rows.length) {
    console.warn('DataTable: No headers or rows after transformation for ID:', dataId);
    return (
      <div className="text-gray-500 py-4 text-center">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-medium">Data Grid</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
                showHeaders ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {showHeaders ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              <span>{showHeaders ? 'Hide Headers' : 'Show Headers'}</span>
            </button>
            <button
              onClick={() => setShowRowNumbers(!showRowNumbers)}
              className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
                showRowNumbers ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {showRowNumbers ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              <span>{showRowNumbers ? 'Hide Rows' : 'Show Rows'}</span>
            </button>
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200"
            >
              <FaFileExport size={12} />
              <span>Export to Sheets</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {showHeaders && (
              <thead className="bg-gray-50">
                <tr>
                  {showRowNumbers && (
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>
                  )}
                  {headers.map((header) => (
                    <th 
                      key={header} 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {showRowNumbers && (
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 w-12">
                      {rowIndex + 1}
                    </td>
                  )}
                  {headers.map((header) => (
                    <td 
                      key={`${rowIndex}-${header}`} 
                      className="px-3 py-2 whitespace-pre-wrap break-words text-sm text-gray-900 min-w-[120px]"
                    >
                      {row[header] !== undefined ? String(row[header]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium">Raw Data</h3>
          <p className="text-sm text-gray-500">JSON format</p>
        </div>
        <div className="p-4 overflow-auto max-h-[300px]">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {JSON.stringify(data?.data, null, 2)}
          </pre>
        </div>
      </div>
      
      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          dataId={dataId}
        />
      )}
    </div>
  )
}

export default DataTable 