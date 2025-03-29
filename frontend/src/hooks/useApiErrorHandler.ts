import { useState, useCallback } from 'react';
import { 
  AppError, 
  ValidationError, 
  ApiError, 
  AuthError, 
  NetworkError,
  getErrorMessage,
  getFormErrors,
  isValidationError,
  isAuthError,
  isNetworkError,
  handleError
} from '../utils/errors';

/**
 * Hook for standardized API error handling
 */
export function useApiErrorHandler() {
  const [error, setError] = useState<AppError | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Clear current errors
   */
  const clearErrors = useCallback(() => {
    setError(null);
    setFormErrors({});
  }, []);

  /**
   * Handle any error, properly categorizing it
   */
  const handleApiError = useCallback((err: unknown) => {
    const appError = handleError(err);
    setError(appError);
    
    // Handle form validation errors specially
    if (isValidationError(appError)) {
      setFormErrors(appError.fieldErrors);
    } else {
      setFormErrors({});
    }
    
    // Handle auth errors (redirect to login)
    if (isAuthError(appError)) {
      console.log('Authentication error detected, redirecting to login');
      // Consider a redirect to login here
    }
    
    return appError;
  }, []);

  /**
   * Wrap an async function with loading state and error handling
   */
  const withErrorHandling = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    options: { 
      showLoading?: boolean;
      onSuccess?: (result: R) => void;
      onError?: (error: AppError) => void;
    } = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      const { showLoading = true, onSuccess, onError } = options;
      
      // Clear previous errors
      clearErrors();
      
      if (showLoading) {
        setIsLoading(true);
      }
      
      try {
        const result = await fn(...args);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        const appError = handleApiError(err);
        
        if (onError) {
          onError(appError);
        }
        
        return undefined;
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    };
  }, [clearErrors, handleApiError]);

  /**
   * Get a user-friendly error message
   */
  const errorMessage = error ? getErrorMessage(error) : '';
  
  /**
   * Check error type
   */
  const isValidation = error ? isValidationError(error) : false;
  const isAuth = error ? isAuthError(error) : false;
  const isNetwork = error ? isNetworkError(error) : false;
  const isApi = error ? error instanceof ApiError : false;
  const statusCode = isApi ? (error as ApiError).status : undefined;

  return {
    error,
    errorMessage,
    formErrors,
    isLoading,
    clearErrors,
    handleApiError,
    withErrorHandling,
    isValidation,
    isAuth,
    isNetwork,
    isApi,
    statusCode
  };
}

export default useApiErrorHandler;