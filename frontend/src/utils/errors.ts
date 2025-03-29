import { ApiErrorResponse, isApiErrorResponse } from '../types/api';
import axios, { AxiosError } from 'axios';

/**
 * Custom error classes for frontend application
 */

/**
 * Base error class for application errors
 */
export class AppError extends Error {
  public code: string;
  
  constructor(message: string, code = 'app_error') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/**
 * Error for API request failures
 */
export class ApiError extends AppError {
  public status: number;
  public details: Record<string, unknown>;
  public originalError?: Error;
  
  constructor(message: string, status = 500, details: Record<string, unknown> = {}, originalError?: Error) {
    super(message, 'api_error');
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.originalError = originalError;
  }
}

/**
 * Error for data validation failures
 */
export class ValidationError extends AppError {
  public fieldErrors: Record<string, string>;
  
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message, 'validation_error');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Error for authentication-related failures
 */
export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'auth_error');
    this.name = 'AuthError';
  }
}

/**
 * Error for network-related issues
 */
export class NetworkError extends AppError {
  constructor(message: string) {
    super(message || 'Network connection error', 'network_error');
    this.name = 'NetworkError';
  }
}

/**
 * Handle any error and convert to standardized format
 * @param error The error to process
 * @returns A standardized AppError
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (axios.isAxiosError(error)) {
    return handleAxiosError(error);
  }
  
  if (error instanceof Error) {
    return new AppError(error.message);
  }
  
  return new AppError(
    typeof error === 'string' ? error : 'An unknown error occurred'
  );
}

/**
 * Handle Axios errors specifically
 * @param error The Axios error to process
 * @returns A standardized ApiError
 */
function handleAxiosError(error: AxiosError): ApiError {
  const status = error.response?.status || 500;
  let message = error.message;
  let details: Record<string, unknown> = {};
  
  // Check if we have a structured API error response
  if (error.response?.data) {
    const data = error.response.data;
    
    if (isApiErrorResponse(data)) {
      message = data.message;
      details = data.details;
      
      // Handle validation errors
      if (data.error === 'EntityValidationError' && data.details.field_errors) {
        return new ValidationError(
          message, 
          data.details.field_errors as Record<string, string>
        );
      }
      
      // Handle auth errors
      if (status === 401 || data.error === 'AuthenticationError') {
        return new AuthError(message);
      }
    }
  }
  
  // Network errors
  if (error.code === 'ECONNABORTED' || !error.response) {
    return new NetworkError(message);
  }
  
  return new ApiError(message, status, details, error);
}

/**
 * Type guards for error checking
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Get a user-friendly error message
 * @param error The error to process
 * @returns A human-readable error message
 */
export function getErrorMessage(error: unknown): string {
  const appError = handleError(error);
  
  // Special handling for different error types
  if (isValidationError(appError)) {
    const fieldErrors = Object.entries(appError.fieldErrors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join(', ');
    return fieldErrors ? `${appError.message} (${fieldErrors})` : appError.message;
  }
  
  if (isNetworkError(appError)) {
    return 'Network connection issue. Please check your connection and try again.';
  }
  
  if (isAuthError(appError)) {
    return 'Authentication error. Please log in again.';
  }
  
  return appError.message;
}

/**
 * Format validation errors for display in forms
 * @param error The error to format
 * @returns An object mapping field names to error messages
 */
export function getFormErrors(error: unknown): Record<string, string> {
  if (isValidationError(error)) {
    return error.fieldErrors;
  }
  
  return {};
}