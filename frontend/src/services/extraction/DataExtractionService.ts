/**
 * Main service for extracting structured data from messages
 */
import { DataExtractionError, DataValidationError } from '../../utils/errors';
import { validateData, schemas, isValidTableData } from '../../utils/validation';
import { DataDetectionService } from './DataDetectionService';
import { DataParserService, ParsedData } from './DataParserService';
import { Message } from '../../utils/api';

export interface ExtractionResult {
  data: ParsedData;
  source: string;
  confidence: number;
  meta_data: Record<string, any>;
}

export class DataExtractionService {
  /**
   * Extract structured data from a message content
   * @param messageContent The message content to extract data from
   * @returns The extracted data in a standardized format
   * @throws DataExtractionError if extraction fails
   */
  static extractStructuredData(messageContent: string): ParsedData {
    try {
      console.log('DataExtractionService: Starting extraction from message content');
      
      // Check if the message has a data section
      if (!DataDetectionService.hasStructuredData(messageContent)) {
        throw new DataExtractionError(
          'No data section found', 
          'The message does not contain a data section marked with ---DATA---'
        );
      }
      
      // Extract the data section
      const dataSection = DataDetectionService.extractDataSection(messageContent);
      
      // Check if the data section is complete
      const completeness = DataDetectionService.isDataSectionComplete(dataSection);
      console.log('DataExtractionService: Data section completeness check:', completeness);
      
      // If the data is not complete with high confidence, try to clean it up
      let dataToParse = dataSection;
      if (!completeness.isComplete || completeness.confidence < 0.8) {
        console.log('DataExtractionService: Data section may be incomplete, attempting to clean');
        dataToParse = DataDetectionService.cleanDataSection(dataSection);
      }
      
      // Parse the data section
      const parsedData = DataParserService.parseDataString(dataToParse);
      
      // Validate the parsed data
      this.validateParsedData(parsedData);
      
      console.log('DataExtractionService: Successfully extracted and validated data');
      return parsedData;
    } catch (e) {
      console.error('DataExtractionService: Error during data extraction:', e);
      
      if (e instanceof DataExtractionError || e instanceof DataValidationError) {
        throw e;
      }
      
      throw new DataExtractionError(
        'Failed to extract data', 
        e.message
      );
    }
  }
  
  /**
   * Extract structured data from a message object
   * @param message The message object to extract data from
   * @returns The extracted data in a standardized format
   * @throws DataExtractionError if extraction fails
   */
  static extractFromMessage(message: Message): ParsedData {
    try {
      // Validate message object
      if (!message || !message.content) {
        throw new DataExtractionError(
          'Invalid message', 
          'Message is empty or has no content'
        );
      }
      
      // Extract from message content
      const extractedData = this.extractStructuredData(message.content);
      
      // Add message metadata
      return {
        ...extractedData,
        meta_data: {
          ...(extractedData.meta_data || {}),
          message_id: message.id,
          conversation_id: message.conversation_id,
          extracted_at: new Date().toISOString()
        }
      };
    } catch (e) {
      console.error('DataExtractionService: Error extracting from message:', e);
      
      if (e instanceof DataExtractionError || e instanceof DataValidationError) {
        throw e;
      }
      
      throw new DataExtractionError(
        'Failed to extract data from message', 
        e.message
      );
    }
  }
  
  /**
   * Validate that parsed data meets the required structure
   * @param data The data to validate
   * @throws DataValidationError if validation fails
   */
  private static validateParsedData(data: ParsedData): void {
    // Check for table data structure (headers and rows)
    const validation = isValidTableData(data);
    
    if (!validation.isValid) {
      throw new DataValidationError(
        'Invalid data structure', 
        { structure: validation.error || 'Data does not have required headers and rows' }
      );
    }
  }
  
  /**
   * Pre-process data before sending to the database
   * Ensures data is in the correct format and structure for storage
   * @param data The data to pre-process
   * @returns Processed data ready for database storage
   */
  static preprocessData(data: ParsedData): ParsedData {
    try {
      console.log('DataExtractionService: Pre-processing data before storage');
      
      // If data has rows and headers, standardize it
      if (data.headers && Array.isArray(data.headers) && 
          data.rows && Array.isArray(data.rows)) {
        
        // Ensure rows are properly formatted as objects
        if (data.rows.length > 0 && Array.isArray(data.rows[0])) {
          const processedRows = data.rows.map((row: any[]) => {
            const rowObj: Record<string, any> = {};
            
            // Map each cell to its corresponding header
            data.headers!.forEach((header, index) => {
              rowObj[header] = index < row.length ? row[index] : null;
            });
            
            return rowObj;
          });
          
          return {
            headers: [...data.headers],
            rows: processedRows,
            meta_data: {
              ...(data.meta_data || {}),
              processed_at: new Date().toISOString()
            }
          };
        }
        
        // If rows are already objects, return as is
        return data;
      }
      
      // Handle the case where we have raw data instead of headers/rows
      if (data.raw) {
        // Try to convert to standard format
        const converted = DataParserService.normalizeJsonData(data.raw);
        return {
          ...converted,
          meta_data: {
            ...(converted.meta_data || {}),
            ...(data.meta_data || {}),
            processed_at: new Date().toISOString()
          }
        };
      }
      
      return data;
    } catch (e) {
      console.error('DataExtractionService: Error preprocessing data:', e);
      throw new DataExtractionError(
        'Failed to preprocess data', 
        e.message
      );
    }
  }
  
  /**
   * Detect if the extracted data appears to be sports-related
   * @param data The extracted data to analyze
   * @returns Object with detected entity type and confidence score
   */
  static detectSportsDataType(data: ParsedData): { 
    isSportsData: boolean; 
    entityType?: string; 
    confidence: number;
    suggestedFields?: Record<string, string>;
  } {
    try {
      if (!data || (!data.headers && !data.rows)) {
        return { isSportsData: false, confidence: 0 };
      }
      
      // Flatten data for analysis
      let fields: string[] = [];
      
      // Handle data with headers
      if (data.headers && Array.isArray(data.headers)) {
        fields = data.headers;
      }
      // Handle array of objects
      else if (Array.isArray(data.rows) && data.rows.length > 0 && typeof data.rows[0] === 'object') {
        fields = Object.keys(data.rows[0]);
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
        }
      };
      
      // Calculate scores for each entity type
      const scores: Record<string, number> = {};
      const fieldMappings: Record<string, Record<string, string>> = {};
      
      // For each entity type, calculate a score
      for (const [entityType, signature] of Object.entries(entitySignatures)) {
        let score = 0;
        const mappings: Record<string, string> = {};
        let hasRequiredFields = true;
        
        // Check if required fields are present
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
        
        // For each field in the data, check if it matches any key field
        for (const field of fields) {
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
        return {
          isSportsData: true,
          entityType: detectedEntityType,
          confidence: maxScore,
          suggestedFields: fieldMappings[detectedEntityType!]
        };
      }
      
      return { isSportsData: false, confidence: maxScore };
    } catch (e) {
      console.error('DataExtractionService: Error detecting sports data type:', e);
      return { isSportsData: false, confidence: 0 };
    }
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
}