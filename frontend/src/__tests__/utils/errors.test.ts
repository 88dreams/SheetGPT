/**
 * Tests for error handling utilities
 */
import axios from 'axios';
import {
  AppError,
  ApiError,
  ValidationError,
  AuthError,
  NetworkError,
  handleError,
  isApiError,
  isValidationError,
  isAuthError,
  isNetworkError,
  getErrorMessage,
  getFormErrors
} from '../../utils/errors';
import { ApiErrorResponse } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Error handling utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBe('app_error');

      const errorWithCode = new AppError('Test error', 'custom_code');
      expect(errorWithCode.code).toBe('custom_code');
    });

    it('should create ApiError with correct properties', () => {
      const error = new ApiError('API error', 404, { field: 'value' });
      expect(error.message).toBe('API error');
      expect(error.name).toBe('ApiError');
      expect(error.code).toBe('api_error');
      expect(error.status).toBe(404);
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should create ValidationError with correct properties', () => {
      const fieldErrors = { name: 'Name is required' };
      const error = new ValidationError('Validation error', fieldErrors);
      expect(error.message).toBe('Validation error');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('validation_error');
      expect(error.fieldErrors).toEqual(fieldErrors);
    });

    it('should create AuthError with correct properties', () => {
      const error = new AuthError('Auth error');
      expect(error.message).toBe('Auth error');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('auth_error');
    });

    it('should create NetworkError with correct properties', () => {
      const error = new NetworkError('Network error');
      expect(error.message).toBe('Network error');
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('network_error');
    });
  });

  describe('handleError', () => {
    it('should return AppError instances unchanged', () => {
      const originalError = new AppError('Original error');
      const result = handleError(originalError);
      expect(result).toBe(originalError);
    });

    it('should convert standard Error to AppError', () => {
      const standardError = new Error('Standard error');
      const result = handleError(standardError);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Standard error');
    });

    it('should handle string errors', () => {
      const result = handleError('String error');
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error');
    });

    it('should handle unknown errors', () => {
      const result = handleError(null);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('An unknown error occurred');
    });
  });

  describe('Axios error handling', () => {
    it('should handle Axios errors with structured API error responses', () => {
      // Mock isAxiosError
      mockedAxios.isAxiosError.mockReturnValue(true);

      // Create mock structured API error
      const apiErrorResponse: ApiErrorResponse = {
        error: 'EntityValidationError',
        message: 'Validation failed',
        details: {
          field_errors: {
            name: 'Name is required',
            email: 'Email is invalid'
          }
        },
        status_code: 400
      };

      // Mock Axios error
      const axiosError = {
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          data: apiErrorResponse
        }
      } as any;

      const result = handleError(axiosError);
      
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Validation failed');
      expect((result as ValidationError).fieldErrors).toEqual({
        name: 'Name is required',
        email: 'Email is invalid'
      });
    });

    it('should handle authentication errors', () => {
      // Mock isAxiosError
      mockedAxios.isAxiosError.mockReturnValue(true);

      // Create mock auth error
      const apiErrorResponse: ApiErrorResponse = {
        error: 'AuthenticationError',
        message: 'Authentication failed',
        details: {},
        status_code: 401
      };

      // Mock Axios error
      const axiosError = {
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          data: apiErrorResponse
        }
      } as any;

      const result = handleError(axiosError);
      
      expect(result).toBeInstanceOf(AuthError);
      expect(result.message).toBe('Authentication failed');
    });

    it('should handle network errors', () => {
      // Mock isAxiosError
      mockedAxios.isAxiosError.mockReturnValue(true);

      // Mock Axios error with no response (network error)
      const axiosError = {
        message: 'Network Error',
        code: 'ECONNABORTED',
        response: undefined
      } as any;

      const result = handleError(axiosError);
      
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('Network Error');
    });

    it('should handle generic API errors', () => {
      // Mock isAxiosError
      mockedAxios.isAxiosError.mockReturnValue(true);

      // Mock Axios error with unstructured response
      const axiosError = {
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          data: 'Internal Server Error'
        }
      } as any;

      const result = handleError(axiosError);
      
      expect(result).toBeInstanceOf(ApiError);
      expect(result.message).toBe('Request failed with status code 500');
      expect((result as ApiError).status).toBe(500);
    });
  });

  describe('Type guards', () => {
    it('should correctly identify ApiError', () => {
      const error = new ApiError('API error', 404);
      expect(isApiError(error)).toBe(true);
      expect(isApiError(new Error('Not API error'))).toBe(false);
    });

    it('should correctly identify ValidationError', () => {
      const error = new ValidationError('Validation error');
      expect(isValidationError(error)).toBe(true);
      expect(isValidationError(new Error('Not validation error'))).toBe(false);
    });

    it('should correctly identify AuthError', () => {
      const error = new AuthError('Auth error');
      expect(isAuthError(error)).toBe(true);
      expect(isAuthError(new Error('Not auth error'))).toBe(false);
    });

    it('should correctly identify NetworkError', () => {
      const error = new NetworkError('Network error');
      expect(isNetworkError(error)).toBe(true);
      expect(isNetworkError(new Error('Not network error'))).toBe(false);
    });
  });

  describe('Error message formatting', () => {
    it('should get user-friendly message for ValidationError', () => {
      const error = new ValidationError('Validation error', {
        name: 'Name is required',
        email: 'Email is invalid'
      });
      
      const message = getErrorMessage(error);
      expect(message).toContain('Validation error');
      expect(message).toContain('name: Name is required');
      expect(message).toContain('email: Email is invalid');
    });

    it('should get user-friendly message for NetworkError', () => {
      const error = new NetworkError('Original network error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Network connection issue. Please check your connection and try again.');
    });

    it('should get user-friendly message for AuthError', () => {
      const error = new AuthError('Original auth error message');
      const message = getErrorMessage(error);
      expect(message).toBe('Authentication error. Please log in again.');
    });

    it('should return original message for other errors', () => {
      const error = new ApiError('API error message');
      const message = getErrorMessage(error);
      expect(message).toBe('API error message');
    });
  });

  describe('Form error formatting', () => {
    it('should extract field errors from ValidationError', () => {
      const fieldErrors = {
        name: 'Name is required',
        email: 'Email is invalid'
      };
      const error = new ValidationError('Validation error', fieldErrors);
      
      const formErrors = getFormErrors(error);
      expect(formErrors).toEqual(fieldErrors);
    });

    it('should return empty object for non-ValidationError', () => {
      const error = new ApiError('API error');
      const formErrors = getFormErrors(error);
      expect(formErrors).toEqual({});
    });
  });
});