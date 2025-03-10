/**
 * Data Extraction Services Index
 * 
 * This file exports all data extraction services and types from a single entry point
 */

// Export all services
export { DataDetectionService } from './DataDetectionService';
export { DataParserService } from './DataParserService';
export { DataExtractionService } from './DataExtractionService';

// Export interfaces
export type { ParsedData } from './DataParserService';
export type { ExtractionResult } from './DataExtractionService';

// Export a main function for simplified usage
import { DataExtractionService } from './DataExtractionService';
import { Message } from '../../utils/api';
import { DataExtractionError } from '../../utils/errors';

/**
 * Extract data from a message
 * This is the main entry point for data extraction
 * 
 * @param message Message to extract data from
 * @returns Extracted data
 */
export function extractDataFromMessage(message: Message) {
  try {
    return DataExtractionService.extractFromMessage(message);
  } catch (e) {
    if (e instanceof DataExtractionError) {
      throw e;
    }
    throw new DataExtractionError(
      'Failed to extract data',
      e.message
    );
  }
}

/**
 * Extract data from message content
 * 
 * @param content Message content to extract data from
 * @returns Extracted data
 */
export function extractDataFromContent(content: string) {
  try {
    return DataExtractionService.extractStructuredData(content);
  } catch (e) {
    if (e instanceof DataExtractionError) {
      throw e;
    }
    throw new DataExtractionError(
      'Failed to extract data',
      e.message
    );
  }
}

/**
 * Check if content contains structured data
 * 
 * @param content Content to check
 * @returns True if content contains structured data
 */
export function hasStructuredData(content: string) {
  if (!content) return false;
  
  // Import locally to avoid circular dependencies
  const { DataDetectionService } = require('./DataDetectionService');
  return DataDetectionService.hasStructuredData(content);
}