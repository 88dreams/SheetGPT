/**
 * Custom error types for application-specific errors
 */

/**
 * Base error class for data-related errors
 */
export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataError';
  }
}

/**
 * Error thrown when data extraction fails
 */
export class DataExtractionError extends DataError {
  public detail: string;
  public source?: string;
  
  constructor(message: string, detail: string = '', source?: string) {
    super(message);
    this.name = 'DataExtractionError';
    this.detail = detail;
    this.source = source;
  }
  
  /**
   * Get a user-friendly error message with details if available
   */
  public getUserMessage(): string {
    if (this.detail) {
      return `${this.message}: ${this.detail}`;
    }
    return this.message;
  }
}

/**
 * Error thrown when data validation fails
 */
export class DataValidationError extends DataError {
  public fields: Record<string, string>;
  
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'DataValidationError';
    this.fields = fields;
  }
  
  /**
   * Get the validation errors for specific fields
   */
  public getFieldErrors(): Record<string, string> {
    return this.fields;
  }
  
  /**
   * Get a formatted string with all field errors
   */
  public getFormattedErrors(): string {
    if (Object.keys(this.fields).length === 0) {
      return this.message;
    }
    
    const fieldErrors = Object.entries(this.fields)
      .map(([field, error]) => `${field}: ${error}`)
      .join(', ');
      
    return `${this.message} (${fieldErrors})`;
  }
}

/**
 * Error thrown when API operations fail
 */
export class ApiError extends DataError {
  public statusCode?: number;
  public responseData?: any;
  
  constructor(message: string, statusCode?: number, responseData?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

/**
 * Helper to determine if an error is a specific type
 */
export function isDataExtractionError(error: any): error is DataExtractionError {
  return error instanceof DataExtractionError;
}

export function isDataValidationError(error: any): error is DataValidationError {
  return error instanceof DataValidationError;
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}