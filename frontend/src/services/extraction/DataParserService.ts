/**
 * Service for parsing data from various formats
 */
import { DataExtractionError } from '../../utils/errors';
import { DataDetectionService } from './DataDetectionService';

export interface ParseResult {
  data: any;
  type: 'json' | 'csv' | 'unknown';
}

export interface ParsedData {
  headers?: string[];
  rows?: any[][] | Record<string, any>[];
  rawData?: any;
  meta_data?: Record<string, any>;
  columns?: any[];
  [key: string]: any;
}

export class DataParserService {
  /**
   * Parse data from a string
   * @param dataString The string containing the data to parse
   * @returns The parsed data object
   * @throws DataExtractionError if parsing fails
   */
  static parseDataString(dataString: string): ParsedData {
    try {
      // Attempt to parse as JSON first
      const parsedJson = this.tryParseJson(dataString);
      if (parsedJson) {
        return parsedJson;
      }
      
      // If JSON parsing failed, try markdown table parsing
      const parsedMarkdown = this.tryParseMarkdownTable(dataString);
      if (parsedMarkdown) {
        return parsedMarkdown;
      }
      
      // If still not parsed, try to clean up the data and parse again
      const cleaned = DataDetectionService.cleanDataSection(dataString);
      const parsedCleaned = this.tryParseJson(cleaned);
      if (parsedCleaned) {
        return parsedCleaned;
      }
      
      throw new DataExtractionError('Failed to parse data', 'The data is not in a recognized format (JSON or markdown table)');
    } catch (e) {
      if (e instanceof DataExtractionError) {
        throw e;
      }
      throw new DataExtractionError('Error parsing data', e.message);
    }
  }
  
  /**
   * Try to parse a string as JSON
   * @param jsonString The string to parse
   * @returns The parsed JSON object or null if parsing fails
   */
  static tryParseJson(jsonString: string): ParsedData | null {
    try {
      // First attempt: parse as is
      try {
        const data = JSON.parse(jsonString);
        return this.normalizeJsonData(data);
      } catch (e) {
        // Continue to more aggressive parsing attempts
      }
      
      // Second attempt: Find the first valid JSON object or array in the string
      const jsonMatches = jsonString.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/g) || [];
      
      // Sort by length (descending) to try the largest (most likely complete) matches first
      const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
      
      for (const match of sortedMatches) {
        try {
          const data = JSON.parse(match);
          return this.normalizeJsonData(data);
        } catch (e) {
          // Try the next match
          continue;
        }
      }
      
      return null;
    } catch (e) {
      console.error('Error trying to parse JSON:', e);
      return null;
    }
  }
  
  /**
   * Parse a markdown table from a string
   * @param markdownString The string containing the markdown table
   * @returns The parsed table data or null if parsing fails
   */
  static tryParseMarkdownTable(markdownString: string): ParsedData | null {
    try {
      // Look for markdown table format
      const tableMatch = markdownString.match(/\|([^\n]+)\|[\s\S]*?(?=\n\n|\n$|$)/i);
      
      if (!tableMatch) {
        return null;
      }
      
      const tableContent = tableMatch[0];
      
      // Parse the table rows
      const rows = tableContent.split('\n')
        .filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'))
        .map(line => {
          // Split by | and remove empty entries (from start/end |)
          return line.split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');
        });
      
      if (rows.length < 2) { // Need at least header and one data row
        return null;
      }
      
      // Skip separator row if present (contains dashes)
      const headerIndex = 0;
      let dataStartIndex = 1;
      
      if (rows.length > 1 && rows[1].some(cell => cell.includes('-'))) {
        dataStartIndex = 2;
      }
      
      const headers = rows[headerIndex];
      const dataRows = rows.slice(dataStartIndex).filter(row => row.length === headers.length);
      
      return {
        headers,
        rows: dataRows,
        meta_data: {
          source: 'markdown-table',
          extracted_at: new Date().toISOString()
        }
      };
    } catch (e) {
      console.error('Error trying to parse markdown table:', e);
      return null;
    }
  }
  
  /**
   * Normalize JSON data into a consistent format
   * @param data The JSON data to normalize
   * @returns The normalized data object
   */
  static normalizeJsonData(data: any): ParsedData {
    // Case 1: Headers and rows format - the preferred format
    if (data.headers && Array.isArray(data.headers) && 
        data.rows && Array.isArray(data.rows)) {
      
      // Convert rows to 2D array if they are objects
      if (data.rows.length > 0 && !Array.isArray(data.rows[0]) && typeof data.rows[0] === 'object') {
        const rows = data.rows.map((row: any) => {
          return data.headers.map((header: string) => {
            return row[header] !== undefined ? row[header] : '';
          });
        });
        
        return {
          headers: [...data.headers],
          rows,
          meta_data: data.meta_data || {
            source: 'json-structure',
            extracted_at: new Date().toISOString()
          }
        };
      }
      
      // If rows are already a 2D array, return as is
      return {
        headers: [...data.headers],
        rows: [...data.rows],
        meta_data: data.meta_data || {
          source: 'json-structure',
          extracted_at: new Date().toISOString()
        }
      };
    }
    
    // Case 2: Array of objects
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
      
      const rows = data.map(item => {
        return headers.map(header => {
          return item[header] !== undefined ? item[header] : '';
        });
      });
      
      return {
        headers,
        rows,
        meta_data: {
          source: 'json-array',
          extracted_at: new Date().toISOString()
        }
      };
    }
    
    // Case 3: Column-oriented format
    if (data.columns && Array.isArray(data.columns) && data.columns.length > 0) {
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
      
      return {
        headers,
        rows,
        meta_data: data.meta_data || {
          source: 'column-oriented',
          extracted_at: new Date().toISOString()
        }
      };
    }
    
    // Case 4: Single object
    if (typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data).filter(key => 
        !key.startsWith('_') && key !== 'headers' && key !== 'rows' && key !== 'columns'
      );
      
      if (keys.length > 0) {
        const headers = keys;
        const row = keys.map(key => data[key] !== undefined ? data[key] : '');
        
        return {
          headers,
          rows: [row],
          meta_data: {
            source: 'single-object',
            extracted_at: new Date().toISOString()
          }
        };
      }
    }
    
    // If we couldn't normalize the data, return it as is
    return {
      raw: data,
      meta_data: {
        source: 'unknown',
        extracted_at: new Date().toISOString()
      }
    };
  }
}