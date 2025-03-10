/**
 * Service for detecting data in message content
 */
import { DataExtractionError } from '../../utils/errors';

export class DataDetectionService {
  /**
   * Constants for data detection
   */
  private static readonly DATA_MARKER = '---DATA---';
  private static readonly STREAM_COMPLETE_MARKER = '__STREAM_COMPLETE__';
  private static readonly PHASE_COMPLETE_MARKER = '[PHASE:COMPLETE]';
  private static readonly STREAM_END_MARKER = '[STREAM_END]';
  
  /**
   * Check if a message contains structured data
   * @param content The message content to check
   * @returns True if the message contains structured data
   */
  static hasStructuredData(content: string): boolean {
    if (!content) return false;
    return content.includes(this.DATA_MARKER);
  }
  
  /**
   * Extract the data section from a message
   * @param content The message content to extract data from
   * @returns The extracted data section as a string
   * @throws DataExtractionError if no data section is found
   */
  static extractDataSection(content: string): string {
    if (!content) {
      throw new DataExtractionError(
        'No content provided', 
        'Message content is empty or undefined'
      );
    }
    
    const parts = content.split(this.DATA_MARKER);
    if (parts.length < 2) {
      throw new DataExtractionError(
        'No data section found', 
        'Message does not contain a data section marked with ---DATA---'
      );
    }
    
    // Get everything after the DATA_MARKER
    let dataSection = parts[1].trim();
    
    // Remove any stream completion markers
    dataSection = dataSection
      .replace(this.STREAM_COMPLETE_MARKER, '')
      .replace(this.PHASE_COMPLETE_MARKER, '')
      .replace(this.STREAM_END_MARKER, '')
      .trim();
      
    if (!dataSection) {
      throw new DataExtractionError(
        'Empty data section', 
        'The data section was found but contains no data'
      );
    }
    
    return dataSection;
  }
  
  /**
   * Check if data section is likely to be complete
   * @param dataSection The data section to check
   * @returns Object with completion status and confidence
   */
  static isDataSectionComplete(dataSection: string): { 
    isComplete: boolean; 
    confidence: number;
    reason?: string;
  } {
    if (!dataSection) {
      return { isComplete: false, confidence: 1.0, reason: 'Empty data section' };
    }
    
    // Check for obvious completeness markers
    const hasClosingBraces = (
      dataSection.endsWith('}}') || 
      dataSection.endsWith(']}') || 
      dataSection.endsWith('"}]') || 
      dataSection.endsWith('"}')
    );
    
    const startsWithOpenBrace = dataSection.trimStart().startsWith('{');
    const hasJsonStructure = (
      dataSection.includes('"headers"') || 
      dataSection.includes('"rows"')
    );
    
    // Perform basic JSON validation check
    let isValidJson = false;
    try {
      JSON.parse(dataSection);
      isValidJson = true;
    } catch (e) {
      // Not valid JSON
    }
    
    if (isValidJson) {
      return { 
        isComplete: true, 
        confidence: 1.0,
        reason: 'Valid JSON with complete structure'
      };
    }
    
    if (startsWithOpenBrace && hasClosingBraces && hasJsonStructure) {
      return { 
        isComplete: true, 
        confidence: 0.9,
        reason: 'Has JSON structure with opening and closing braces'
      };
    }
    
    if (startsWithOpenBrace && hasJsonStructure) {
      return { 
        isComplete: true, 
        confidence: 0.7,
        reason: 'Has JSON structure but may be incomplete'
      };
    }
    
    if (startsWithOpenBrace && hasClosingBraces) {
      return { 
        isComplete: true, 
        confidence: 0.6,
        reason: 'Has braces but unclear structure'
      };
    }
    
    return { 
      isComplete: false, 
      confidence: 0.8,
      reason: 'Missing expected JSON structure'
    };
  }
  
  /**
   * Attempt to clean up a data section for parsing
   * @param dataSection The data section to clean
   * @returns The cleaned data section
   */
  static cleanDataSection(dataSection: string): string {
    // Remove any stream markers
    let cleaned = dataSection
      .replace(this.STREAM_COMPLETE_MARKER, '')
      .replace(this.PHASE_COMPLETE_MARKER, '')
      .replace(this.STREAM_END_MARKER, '')
      .trim();
      
    // Fix common JSON syntax errors
    
    // Fix missing quotes around property names
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    // Try to fix unbalanced braces by adding missing closing braces
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      cleaned += '}'.repeat(openBraces - closeBraces);
    }
    
    // Try to fix unbalanced brackets
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      cleaned += ']'.repeat(openBrackets - closeBrackets);
    }
    
    return cleaned;
  }
}