/**
 * Tests for useApiErrorHandler hook
 */
import { renderHook, act } from '@testing-library/react';
import { useApiErrorHandler } from '../../hooks/useApiErrorHandler';
import { 
  ApiError, 
  ValidationError, 
  AuthError, 
  NetworkError 
} from '../../utils/errors';

describe('useApiErrorHandler', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBe('');
    expect(result.current.formErrors).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isValidation).toBe(false);
    expect(result.current.isAuth).toBe(false);
    expect(result.current.isNetwork).toBe(false);
    expect(result.current.isApi).toBe(false);
    expect(result.current.statusCode).toBeUndefined();
  });

  it('should handle API errors correctly', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    const apiError = new ApiError('API error', 404, { entity_id: '123' });
    
    act(() => {
      result.current.handleApiError(apiError);
    });
    
    expect(result.current.error).toBe(apiError);
    expect(result.current.errorMessage).toBe('API error');
    expect(result.current.isApi).toBe(true);
    expect(result.current.statusCode).toBe(404);
  });

  it('should handle validation errors and set form errors', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    const fieldErrors = { name: 'Name is required' };
    const validationError = new ValidationError('Validation error', fieldErrors);
    
    act(() => {
      result.current.handleApiError(validationError);
    });
    
    expect(result.current.error).toBe(validationError);
    expect(result.current.isValidation).toBe(true);
    expect(result.current.formErrors).toEqual(fieldErrors);
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    // First set an error
    act(() => {
      result.current.handleApiError(new ApiError('API error'));
    });
    
    // Then clear it
    act(() => {
      result.current.clearErrors();
    });
    
    expect(result.current.error).toBeNull();
    expect(result.current.formErrors).toEqual({});
    expect(result.current.errorMessage).toBe('');
  });

  it('should wrap async functions with error handling', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    // Success case
    const successFn = jest.fn().mockResolvedValue('success');
    const onSuccess = jest.fn();
    
    let wrappedFn = result.current.withErrorHandling(successFn, { onSuccess });
    
    await act(async () => {
      const res = await wrappedFn();
      expect(res).toBe('success');
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith('success');
    
    // Error case
    const error = new ApiError('API error');
    const failureFn = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();
    
    wrappedFn = result.current.withErrorHandling(failureFn, { onError });
    
    await act(async () => {
      const res = await wrappedFn();
      expect(res).toBeUndefined();
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(onError).toHaveBeenCalled();
  });

  it('should not show loading state when showLoading is false', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    const successFn = jest.fn().mockResolvedValue('success');
    const wrappedFn = result.current.withErrorHandling(successFn, { showLoading: false });
    
    await act(async () => {
      await wrappedFn();
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('should identify different error types correctly', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    
    // API error
    act(() => {
      result.current.handleApiError(new ApiError('API error', 500));
    });
    expect(result.current.isApi).toBe(true);
    expect(result.current.isValidation).toBe(false);
    expect(result.current.isAuth).toBe(false);
    expect(result.current.isNetwork).toBe(false);
    
    // Validation error
    act(() => {
      result.current.handleApiError(new ValidationError('Validation error'));
    });
    expect(result.current.isApi).toBe(false);
    expect(result.current.isValidation).toBe(true);
    expect(result.current.isAuth).toBe(false);
    expect(result.current.isNetwork).toBe(false);
    
    // Auth error
    act(() => {
      result.current.handleApiError(new AuthError('Auth error'));
    });
    expect(result.current.isApi).toBe(false);
    expect(result.current.isValidation).toBe(false);
    expect(result.current.isAuth).toBe(true);
    expect(result.current.isNetwork).toBe(false);
    
    // Network error
    act(() => {
      result.current.handleApiError(new NetworkError('Network error'));
    });
    expect(result.current.isApi).toBe(false);
    expect(result.current.isValidation).toBe(false);
    expect(result.current.isAuth).toBe(false);
    expect(result.current.isNetwork).toBe(true);
  });
});