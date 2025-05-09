/**
 * Data validation utilities
 */
import { DataValidationError } from './errors';

/**
 * Basic schema for validating extracted data
 */
export interface DataSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: boolean;
  properties?: Record<string, DataSchema>;
  items?: DataSchema;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
}

/**
 * Standard schemas for commonly used data structures
 */
export const schemas = {
  /**
   * Schema for structured table data with headers and rows
   */
  tableData: {
    type: 'object',
    required: true,
    properties: {
      headers: {
        type: 'array',
        required: true,
        items: { type: 'string' },
        minItems: 1
      },
      rows: {
        type: 'array',
        required: true,
        items: { type: 'array' }
      }
    }
  },
  
  /**
   * Schema for sports entity data
   */
  sportsEntity: {
    type: 'object',
    required: true,
    properties: {
      name: { type: 'string', required: true },
      type: { type: 'string', required: true }
    }
  }
} as const;

/**
 * Validate data against a schema
 * @param data The data to validate
 * @param schema The schema to validate against
 * @returns True if the data is valid, otherwise throws DataValidationError
 */
export function validateData(data: any, schema: DataSchema): boolean {
  const errors: Record<string, string> = {};
  
  // Check if data is null or undefined
  if (data === null || data === undefined) {
    if (schema.required) {
      throw new DataValidationError('Data is required but was not provided');
    }
    return true;
  }
  
  // Validate type
  const dataType = Array.isArray(data) ? 'array' : typeof data;
  if (dataType !== schema.type) {
    throw new DataValidationError(`Expected ${schema.type} but got ${dataType}`);
  }
  
  // Type-specific validations
  switch (schema.type) {
    case 'string':
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.minLength = `String must be at least ${schema.minLength} characters`;
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.maxLength = `String must be at most ${schema.maxLength} characters`;
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        errors.pattern = `String must match pattern ${schema.pattern}`;
      }
      break;
      
    case 'array':
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.minItems = `Array must have at least ${schema.minItems} items`;
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.maxItems = `Array must have at most ${schema.maxItems} items`;
      }
      if (schema.items && data.length > 0) {
        try {
          // Validate each item in the array
          data.forEach((item: any, index: number) => {
            try {
              validateData(item, schema.items!);
            } catch (e) {
              if (e instanceof DataValidationError) {
                Object.entries(e.fields).forEach(([field, error]) => {
                  errors[`items[${index}].${field}`] = error;
                });
              } else {
                errors[`items[${index}]`] = e.message;
              }
            }
          });
        } catch (e) {
          errors.items = e.message;
        }
      }
      break;
      
    case 'object':
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          try {
            if (propSchema.required && data[key] === undefined) {
              errors[key] = `Property ${key} is required`;
            } else if (data[key] !== undefined) {
              validateData(data[key], propSchema);
            }
          } catch (e) {
            if (e instanceof DataValidationError) {
              Object.entries(e.fields).forEach(([field, error]) => {
                errors[`${key}.${field}`] = error;
              });
            } else {
              errors[key] = e.message;
            }
          }
        });
      }
      break;
  }
  
  // If there are any errors, throw a validation error
  if (Object.keys(errors).length > 0) {
    throw new DataValidationError('Data validation failed', errors);
  }
  
  return true;
}

/**
 * Check if data has required structure for table data
 * @param data Data to check
 * @returns An object with boolean status and optional error message
 */
export function isValidTableData(data: any): { isValid: boolean; error?: string } {
  try {
    validateData(data, schemas.tableData);
    
    // Additional check: headers and rows should be consistent
    if (data.rows.length > 0) {
      const headerCount = data.headers.length;
      const inconsistentRows = data.rows.filter((row: any[]) => row.length !== headerCount);
      
      if (inconsistentRows.length > 0) {
        return {
          isValid: false,
          error: `Found ${inconsistentRows.length} rows with inconsistent column count. Headers: ${headerCount}, Row lengths: ${inconsistentRows.map((r: any[]) => r.length).join(', ')}`
        };
      }
    }
    
    return { isValid: true };
  } catch (e) {
    if (e instanceof DataValidationError) {
      return { isValid: false, error: e.getFormattedErrors() };
    }
    return { isValid: false, error: e.message };
  }
}