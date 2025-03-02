import { api } from '../utils/api'
import { 
  transformToStandardFormat, 
  transformToRowObjects, 
  transformDataForDisplay,
  StandardDataFormat 
} from '../utils/dataTransformer'

/**
 * Interface for extracted data from messages
 */
export interface ExtractedData {
  headers?: string[]
  rows?: any[]
  columns?: any[]
  meta_data?: Record<string, any>
}

/**
 * Service for extracting and managing structured data
 */
export class DataExtractionService {
  /**
   * Extract structured data from a message content
   * @param messageContent The message content to extract data from
   * @returns Extracted data in a standardized format or null if no data found
   */
  static extractStructuredData(messageContent: string): ExtractedData | null {
    try {
      console.log('DataExtractionService: Extracting data from message content');
      
      // First, look for markdown table format
      const extractedTable = this.extractTableFromMarkdown(messageContent);
      if (extractedTable) {
        return extractedTable;
      }
      
      // Then, look for JSON-like structures
      const extractedJson = this.extractJsonStructures(messageContent);
      if (extractedJson) {
        return extractedJson;
      }
      
      // If we get here, we couldn't extract structured data
      console.log('DataExtractionService: No structured data found in message');
      return null;
    } catch (e) {
      console.error('DataExtractionService: Error extracting structured data:', e);
      return null;
    }
  }
  
  /**
   * Extract table data from markdown format
   * @param content The message content
   * @returns Extracted table data or null if no table found
   */
  private static extractTableFromMarkdown(content: string): ExtractedData | null {
    // Look for markdown table format
    const tableMatch = content.match(/\|([^\n]+)\|[\s\S]*?(?=\n\n|\n$|$)/i);
    
    if (!tableMatch) {
      return null;
    }
    
    console.log('DataExtractionService: Found table in markdown format');
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
    
    console.log('DataExtractionService: Extracted table data', { 
      headers, 
      rowCount: dataRows.length
    });
    
    return {
      headers,
      rows: dataRows,
      meta_data: {
        source: 'markdown-table',
        extracted_at: new Date().toISOString()
      }
    };
  }
  
  /**
   * Extract JSON structures from message content
   * @param content The message content
   * @returns Extracted JSON data or null if no valid JSON found
   */
  private static extractJsonStructures(content: string): ExtractedData | null {
    console.log('DataExtractionService: Attempting to extract JSON structures from content');
    
    // Look for JSON-like structures in the message
    const jsonMatches = content.match(/\{[\s\S]*?\}/g) || [];
    const jsonArrayMatches = content.match(/\[[\s\S]*?\]/g) || [];
    
    const allMatches = [...jsonMatches, ...jsonArrayMatches];
    
    if (allMatches.length === 0) {
      console.log('DataExtractionService: No JSON-like structures found in message');
      return null;
    }
    
    console.log(`DataExtractionService: Found ${allMatches.length} potential JSON structures`);
    
    // Try to parse each match, starting with the largest one (most likely to be the complete structure)
    const sortedMatches = allMatches.sort((a, b) => b.length - a.length);
    
    for (const match of sortedMatches) {
      try {
        console.log(`DataExtractionService: Attempting to parse JSON structure: ${match.substring(0, 100)}...`);
        const data = JSON.parse(match);
        console.log('DataExtractionService: Successfully parsed JSON structure', data);
        
        // Special case for sports data: Check if it contains typical sports entity fields
        const sportDataFields = ['name', 'team', 'player', 'league', 'city', 'state', 'stadium', 'sport', 'founded_year'];
        const dataKeys = Array.isArray(data) && data.length > 0 
          ? Object.keys(data[0]) 
          : Object.keys(data);
          
        const isSportsData = dataKeys.some(key => 
          sportDataFields.includes(key.toLowerCase())
        );
        
        if (isSportsData) {
          console.log('DataExtractionService: Detected sports data format');
          
          // If it's an array, return it directly
          if (Array.isArray(data)) {
            return {
              rows: data,
              meta_data: {
                source: 'json-structure',
                data_type: 'sports-data',
                extracted_at: new Date().toISOString()
              }
            };
          }
          
          // If it has a rows property that's an array, use that
          if (data.rows && Array.isArray(data.rows)) {
            return {
              ...data,
              meta_data: {
                ...(data.meta_data || {}),
                source: 'json-structure',
                data_type: 'sports-data',
                extracted_at: new Date().toISOString()
              }
            };
          }
          
          // If it's a single object, wrap it in an array
          return {
            rows: [data],
            meta_data: {
              source: 'json-structure',
              data_type: 'sports-data',
              extracted_at: new Date().toISOString()
            }
          };
        }
        
        // Check if this looks like our expected data format
        if (data.headers && data.rows) {
          console.log('DataExtractionService: Found data with headers and rows');
          return {
            ...data,
            meta_data: {
              ...(data.meta_data || {}),
              source: 'json-structure',
              extracted_at: new Date().toISOString()
            }
          };
        } else if (data.rows || (Array.isArray(data) && data.length > 0)) {
          console.log('DataExtractionService: Found data with rows only');
          return {
            rows: Array.isArray(data) ? data : data.rows,
            columns: data.columns,
            meta_data: {
              ...(data.meta_data || {}),
              source: 'json-structure',
              extracted_at: new Date().toISOString()
            }
          };
        } else if (data.columns && Array.isArray(data.columns)) {
          console.log('DataExtractionService: Found column-oriented data');
          return {
            columns: data.columns,
            meta_data: {
              ...(data.meta_data || {}),
              source: 'json-structure',
              extracted_at: new Date().toISOString()
            }
          };
        } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
          console.log('DataExtractionService: Found array of objects');
          return {
            rows: data,
            meta_data: {
              source: 'json-structure',
              extracted_at: new Date().toISOString()
            }
          };
        } else if (typeof data === 'object' && !Array.isArray(data)) {
          // Handle case where data is a single object with properties
          console.log('DataExtractionService: Found single object');
          const keys = Object.keys(data).filter(key => !key.startsWith('_'));
          if (keys.length > 0) {
            return {
              headers: keys,
              rows: [keys.map(key => data[key])],
              meta_data: {
                source: 'json-structure',
                extracted_at: new Date().toISOString()
              }
            };
          }
        }
      } catch (e) {
        console.error('DataExtractionService: Error parsing JSON match:', e);
        // Continue to the next match
      }
    }
    
    return null;
  }
  
  /**
   * Append rows to existing structured data
   * @param dataId The ID of the structured data
   * @param rows The rows to append
   * @param metadata Optional metadata to update
   * @returns True if successful, false otherwise
   */
  static async appendRows(
    dataId: string, 
    rows: any[], 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // First, update the structured data metadata
      if (metadata) {
        await this.updateMetadata(dataId, metadata);
      }
      
      // Process rows to ensure they're in the correct format before adding
      const processedRows = this.processRowsForAppending(rows, metadata);
      
      console.log('DataExtractionService: Processed rows for appending:', processedRows);
      
      // Check if we have any rows to add
      if (processedRows.length === 0) {
        console.warn('DataExtractionService: No rows to append after processing');
        return false;
      }
      
      // Initialize empty data if needed
      await this.initializeDataIfEmpty(dataId, processedRows);
      
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
   * Update metadata for structured data
   * @param dataId The ID of the structured data
   * @param metadata The metadata to update
   */
  private static async updateMetadata(dataId: string, metadata: Record<string, any>): Promise<void> {
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
      
      console.log('DataExtractionService: Updating metadata:', updatedMetadata);
      
      // Update the structured data with the new metadata
      await api.data.updateStructuredData(dataId, {
        meta_data: updatedMetadata
      });
    } catch (error) {
      console.error('DataExtractionService: Error updating metadata:', error);
      // Continue with adding rows even if metadata update fails
    }
  }
  
  /**
   * Process rows for appending to structured data
   * @param rows The rows to process
   * @param metadata Optional metadata to include
   * @returns Processed rows ready for appending
   */
  private static processRowsForAppending(rows: any[], metadata?: Record<string, any>): any[] {
    return rows.map(row => {
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
  }
  
  /**
   * Initialize empty data structure if needed
   * @param dataId The ID of the structured data
   * @param processedRows The processed rows to use for initialization
   */
  private static async initializeDataIfEmpty(dataId: string, processedRows: any[]): Promise<void> {
    try {
      const currentData = await api.data.getStructuredDataById(dataId);
      
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
      }
    } catch (error) {
      console.error('DataExtractionService: Error initializing data:', error);
      // Continue with adding rows even if initialization fails
    }
  }
  
  /**
   * Add new columns to existing structured data
   * @param dataId The ID of the structured data
   * @param columns The columns to add
   * @returns True if successful, false otherwise
   */
  static async addColumns(dataId: string, columns: any[]): Promise<boolean> {
    try {
      // This would need to be implemented in your API
      // For now, we'll just log that this would happen
      console.log('DataExtractionService: Would add columns to data', dataId, columns);
      return true;
    } catch (e) {
      console.error('DataExtractionService: Error adding columns:', e);
      return false;
    }
  }
  
  /**
   * Pre-process data before sending to the database
   * This ensures the data is in the correct format and structure
   * @param data The data to pre-process
   * @returns Processed data ready for database storage
   */
  static async preprocessData(data: any): Promise<any> {
    console.log('DataExtractionService: Pre-processing data before storage', data);
    
    // If data already has the expected structure, return it
    if (data && data.rows && Array.isArray(data.rows)) {
      // Ensure rows are properly formatted as objects if they're arrays
      if (data.rows.length > 0 && Array.isArray(data.rows[0])) {
        console.log('DataExtractionService: Converting row arrays to objects');
        
        // Get headers from data or generate them
        const headers = data.headers || 
          Array.from({ length: data.rows[0].length }, (_, i) => `Column ${i+1}`);
        
        // Convert each row array to an object
        const processedRows = data.rows.map((row: any[]) => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header: string, index: number) => {
            rowObj[header] = index < row.length ? row[index] : null;
          });
          return rowObj;
        });
        
        return {
          ...data,
          headers,
          rows: processedRows
        };
      }
      
      return data;
    }
    
    // Use the transformer to standardize the data format
    const { headers, rows } = transformDataForDisplay(data);
    
    // Convert row objects back to the expected database format
    const processedRows = rows.map(row => {
      const rowObj: Record<string, any> = {};
      headers.forEach(header => {
        rowObj[header] = row[header];
      });
      return rowObj;
    });
    
    return {
      headers,
      rows: processedRows,
      column_order: headers
    };
  }
  
  /**
   * Transform data from various formats to a standard row format
   * @param data The data to transform
   * @returns Transformed data as row objects
   */
  static transformToRowFormat(data: any): any[] {
    console.log('DataExtractionService: Transforming data to row format', data);
    
    // Handle case where data contains column_order with "headers,rows"
    if (data && data.column_order && 
        Array.isArray(data.column_order) && 
        data.column_order.includes('headers') && 
        data.column_order.includes('rows')) {
      console.log('DataExtractionService: Detected column_order metadata, using rows data instead');
      
      // If we have rows data, use that instead
      if (data.rows && Array.isArray(data.rows)) {
        // Use the centralized transformer to ensure consistent handling
        return DataExtractionService.transformToRowFormat(data.rows);
      }
    }
    
    // Use the centralized data transformer utility
    const { rows } = transformDataForDisplay(data);
    
    return rows;
  }

  /**
   * Detect if the extracted data appears to be sports-related
   * @param data The extracted data to analyze
   * @returns Object with detected entity type and confidence score
   */
  static detectSportsDataType(data: any): { 
    isSportsData: boolean; 
    entityType?: string; 
    confidence: number;
    suggestedFields?: Record<string, string>;
  } {
    if (!data) {
      return { isSportsData: false, confidence: 0 };
    }

    // Initialize result
    let result = { 
      isSportsData: false, 
      entityType: undefined as string | undefined, 
      confidence: 0,
      suggestedFields: {} as Record<string, string>
    };

    // Get fields to analyze
    let fields: string[] = [];
    
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0) {
      fields = Object.keys(data[0]);
    } 
    // Handle single object
    else if (typeof data === 'object' && data !== null) {
      fields = Object.keys(data);
    }
    // Handle data with headers and rows
    else if (data.headers && Array.isArray(data.headers)) {
      fields = data.headers;
    }

    if (fields.length === 0) {
      return { isSportsData: false, confidence: 0 };
    }

    // Define entity type signatures with key fields and their weights
    const entitySignatures = {
      league: {
        keyFields: ['league', 'sport', 'country', 'founded', 'year', 'division', 'conference', 'name'],
        requiredFields: ['name'],
        weight: 1.0
      },
      team: {
        keyFields: ['team', 'city', 'state', 'mascot', 'league', 'founded', 'name', 'stadium'],
        requiredFields: ['name'],
        weight: 1.0
      },
      player: {
        keyFields: ['player', 'name', 'first', 'last', 'position', 'jersey', 'number', 'team', 'nationality', 'birth'],
        requiredFields: ['name', 'position'],
        weight: 1.0
      },
      game: {
        keyFields: ['game', 'match', 'date', 'time', 'home', 'away', 'team', 'score', 'season', 'stadium'],
        requiredFields: ['date'],
        weight: 1.0
      },
      stadium: {
        keyFields: ['stadium', 'venue', 'arena', 'capacity', 'location', 'city', 'state', 'opened', 'name'],
        requiredFields: ['name'],
        weight: 1.0
      },
      broadcast: {
        keyFields: ['broadcast', 'rights', 'media', 'network', 'television', 'streaming', 'company', 'territory'],
        requiredFields: ['company'],
        weight: 0.8
      },
      production: {
        keyFields: ['production', 'service', 'company', 'provider', 'crew', 'equipment', 'technical'],
        requiredFields: ['company'],
        weight: 0.7
      },
      brand: {
        keyFields: ['brand', 'sponsor', 'partnership', 'advertising', 'endorsement', 'deal', 'contract'],
        requiredFields: ['name'],
        weight: 0.7
      }
    };

    // Calculate scores for each entity type
    const scores: Record<string, number> = {};
    const fieldMappings: Record<string, Record<string, string>> = {};

    // For each entity type
    for (const [entityType, signature] of Object.entries(entitySignatures)) {
      let score = 0;
      const mappings: Record<string, string> = {};
      let hasRequiredFields = true;

      // Check if required fields are present (or similar fields)
      for (const requiredField of signature.requiredFields) {
        const matchingField = this.findBestMatchingField(requiredField, fields);
        if (matchingField) {
          mappings[matchingField] = requiredField;
        } else {
          hasRequiredFields = false;
        }
      }

      // If missing required fields, skip this entity type
      if (!hasRequiredFields) {
        scores[entityType] = 0;
        continue;
      }

      // For each field in the data
      for (const field of fields) {
        // Check if this field matches any key field for this entity type
        for (const keyField of signature.keyFields) {
          if (this.fieldMatches(field, keyField)) {
            score += 1;
            
            // If not already mapped, add to mappings
            if (!Object.keys(mappings).includes(field)) {
              mappings[field] = keyField;
            }
            break;
          }
        }
      }

      // Normalize score based on number of fields and weight
      scores[entityType] = (score / fields.length) * signature.weight;
      fieldMappings[entityType] = mappings;
    }

    // Find the entity type with the highest score
    let maxScore = 0;
    let detectedEntityType: string | undefined = undefined;

    for (const [entityType, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedEntityType = entityType;
      }
    }

    // If score is above threshold, consider it sports data
    if (maxScore > 0.3) {
      result.isSportsData = true;
      result.entityType = detectedEntityType;
      result.confidence = maxScore;
      result.suggestedFields = fieldMappings[detectedEntityType!];
    }

    return result;
  }

  /**
   * Check if a field name matches a key field
   * @param field The field name to check
   * @param keyField The key field to match against
   * @returns True if the field matches the key field
   */
  private static fieldMatches(field: string, keyField: string): boolean {
    // Normalize field names for comparison
    const normalizedField = field.toLowerCase().trim();
    const normalizedKeyField = keyField.toLowerCase().trim();
    
    // Exact match
    if (normalizedField === normalizedKeyField) {
      return true;
    }
    
    // Contains match
    if (normalizedField.includes(normalizedKeyField) || normalizedKeyField.includes(normalizedField)) {
      return true;
    }
    
    // Check for common prefixes/suffixes
    const prefixes = ['team_', 'player_', 'game_', 'league_', 'stadium_'];
    for (const prefix of prefixes) {
      if (normalizedField === prefix + normalizedKeyField) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Find the best matching field in a list of fields
   * @param targetField The field to find a match for
   * @param availableFields The available fields to search in
   * @returns The best matching field or null if no good match
   */
  private static findBestMatchingField(targetField: string, availableFields: string[]): string | null {
    // First try exact match
    const exactMatch = availableFields.find(field => 
      field.toLowerCase() === targetField.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Then try contains match
    const containsMatches = availableFields.filter(field => 
      field.toLowerCase().includes(targetField.toLowerCase()) || 
      targetField.toLowerCase().includes(field.toLowerCase())
    );
    
    if (containsMatches.length > 0) {
      // Return the shortest match as it's likely more specific
      return containsMatches.sort((a, b) => a.length - b.length)[0];
    }
    
    return null;
  }

  /**
   * Generate field mapping recommendations for a specific entity type
   * @param data The data to analyze
   * @param entityType The target entity type
   * @returns Recommended field mappings
   */
  static generateFieldMappingRecommendations(data: any, entityType: string): Record<string, string> {
    if (!data || !entityType) {
      return {};
    }
    
    // Define target fields for each entity type
    const targetFields: Record<string, string[]> = {
      league: ['name', 'sport', 'country', 'founded_year', 'description'],
      team: ['name', 'city', 'state', 'country', 'founded_year', 'league_id', 'stadium_id'],
      player: ['first_name', 'last_name', 'position', 'jersey_number', 'birth_date', 'nationality', 'team_id'],
      game: ['name', 'date', 'time', 'home_team_id', 'away_team_id', 'stadium_id', 'season', 'status'],
      stadium: ['name', 'city', 'state', 'country', 'capacity', 'opened_year', 'description'],
      broadcast: ['name', 'company_id', 'entity_type', 'entity_id', 'start_date', 'end_date', 'territory', 'value', 'description'],
      production: ['name', 'company_id', 'entity_type', 'entity_id', 'service_type', 'start_date', 'end_date', 'description'],
      brand: ['name', 'brand_id', 'entity_type', 'entity_id', 'relationship_type', 'start_date', 'end_date', 'value', 'description']
    };
    
    // Get source fields from data
    let sourceFields: string[] = [];
    
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0) {
      sourceFields = Object.keys(data[0]);
    } 
    // Handle single object
    else if (typeof data === 'object' && data !== null) {
      sourceFields = Object.keys(data);
    }
    // Handle data with headers and rows
    else if (data.headers && Array.isArray(data.headers)) {
      sourceFields = data.headers;
    }
    
    if (sourceFields.length === 0 || !targetFields[entityType]) {
      return {};
    }
    
    const recommendations: Record<string, string> = {};
    
    // For each target field, find the best matching source field
    for (const targetField of targetFields[entityType]) {
      // Define synonyms for common fields
      const synonyms: Record<string, string[]> = {
        'name': ['name', 'title', 'label'],
        'first_name': ['first_name', 'first', 'given_name', 'given'],
        'last_name': ['last_name', 'last', 'surname', 'family_name'],
        'position': ['position', 'role', 'job', 'playing_position'],
        'jersey_number': ['jersey_number', 'number', 'jersey', 'shirt_number'],
        'birth_date': ['birth_date', 'birthdate', 'dob', 'date_of_birth', 'born'],
        'nationality': ['nationality', 'country', 'citizenship', 'nation'],
        'team_id': ['team_id', 'team', 'club', 'squad'],
        'league_id': ['league_id', 'league', 'competition', 'tournament'],
        'stadium_id': ['stadium_id', 'stadium', 'venue', 'arena', 'field'],
        'city': ['city', 'town', 'location', 'municipality'],
        'state': ['state', 'province', 'region', 'territory'],
        'country': ['country', 'nation', 'land'],
        'founded_year': ['founded_year', 'founded', 'established', 'year_founded', 'year_established'],
        'capacity': ['capacity', 'seats', 'size', 'attendance'],
        'opened_year': ['opened_year', 'opened', 'built', 'constructed', 'year_opened'],
        'description': ['description', 'details', 'info', 'about', 'summary'],
        'date': ['date', 'game_date', 'match_date', 'day'],
        'time': ['time', 'game_time', 'match_time', 'start_time'],
        'home_team_id': ['home_team_id', 'home_team', 'home', 'host_team'],
        'away_team_id': ['away_team_id', 'away_team', 'away', 'visiting_team', 'guest_team'],
        'season': ['season', 'year', 'competition_year'],
        'status': ['status', 'state', 'condition', 'game_status'],
        'company_id': ['company_id', 'company', 'corporation', 'business', 'organization'],
        'entity_type': ['entity_type', 'type', 'category'],
        'entity_id': ['entity_id', 'entity', 'related_to', 'associated_with'],
        'start_date': ['start_date', 'begins', 'from', 'starting'],
        'end_date': ['end_date', 'ends', 'until', 'ending', 'expiry'],
        'territory': ['territory', 'region', 'area', 'market', 'geography'],
        'value': ['value', 'amount', 'cost', 'price', 'worth'],
        'service_type': ['service_type', 'service', 'type_of_service'],
        'brand_id': ['brand_id', 'brand', 'company', 'sponsor'],
        'relationship_type': ['relationship_type', 'relationship', 'partnership_type', 'sponsorship_type']
      };
      
      // Try to find a match using synonyms
      let bestMatch: string | null = null;
      
      if (synonyms[targetField]) {
        for (const synonym of synonyms[targetField]) {
          const match = sourceFields.find(field => 
            field.toLowerCase() === synonym.toLowerCase() ||
            field.toLowerCase().includes(synonym.toLowerCase())
          );
          
          if (match) {
            bestMatch = match;
            break;
          }
        }
      }
      
      // If no match found with synonyms, try a more general approach
      if (!bestMatch) {
        bestMatch = this.findBestMatchingField(targetField, sourceFields);
      }
      
      // If a match was found, add it to recommendations
      if (bestMatch) {
        recommendations[bestMatch] = targetField;
      }
    }
    
    return recommendations;
  }
} 