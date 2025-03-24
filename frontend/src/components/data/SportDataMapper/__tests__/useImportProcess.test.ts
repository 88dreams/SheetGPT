import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import useImportProcess from '../hooks/useImportProcess';

// Mock the sportDataMapper utilities
jest.mock('../../../../utils/sportDataMapper', () => ({
  validateEntityData: jest.fn().mockImplementation(() => ({ isValid: true, errors: [] })),
  enhancedMapToDatabaseFieldNames: jest.fn().mockImplementation(async (_entityType, data) => data)
}));

// Mock the SportsDatabaseService
jest.mock('../../../../services/SportsDatabaseService', () => ({
  __esModule: true,
  default: {
    createEntity: jest.fn().mockImplementation(() => Promise.resolve({ id: '123' }))
  }
}));

// Mock the API
jest.mock('../../../../utils/api', () => ({
  api: {
    sports: {
      createBrandRelationship: jest.fn().mockImplementation(() => Promise.resolve({ id: '123' }))
    }
  }
}));

describe('useImportProcess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useImportProcess());
    
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isBatchImporting).toBe(false);
    expect(result.current.importResults).toBeNull();
    expect(result.current.notification).toBeNull();
  });
  
  it('should show and auto-hide notifications', () => {
    const { result } = renderHook(() => useImportProcess());
    
    // Show a notification
    act(() => {
      result.current.showNotification('success', 'Test notification');
    });
    
    expect(result.current.notification).toEqual({
      type: 'success',
      message: 'Test notification'
    });
    
    // Notification should auto-hide after 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(result.current.notification).toBeNull();
  });
  
  it('should save a record to the database', async () => {
    const { result } = renderHook(() => useImportProcess());
    
    const entityType = 'team';
    const mappedData = { name: 'Test Team', city: 'Test City' };
    const currentRecord = { name: 'Test Team', city: 'Test City' };
    
    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveToDatabase(entityType, mappedData, currentRecord);
    });
    
    expect(saveResult).toBe(true);
    expect(result.current.notification?.type).toBe('success');
  });
  
  it('should handle validation errors when saving', async () => {
    // Override the mock to simulate a validation error
    const validateEntityDataMock = require('../../../../utils/sportDataMapper').validateEntityData;
    validateEntityDataMock.mockImplementationOnce(() => ({
      isValid: false,
      errors: ['Name is required']
    }));
    
    const { result } = renderHook(() => useImportProcess());
    
    const entityType = 'team';
    const mappedData = { city: 'Test City' }; // Missing required name field
    const currentRecord = { city: 'Test City' };
    
    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveToDatabase(entityType, mappedData, currentRecord);
    });
    
    expect(saveResult).toBe(false);
    expect(result.current.notification?.type).toBe('error');
    expect(result.current.notification?.message).toContain('Validation failed');
  });
  
  it('should handle API errors when saving', async () => {
    // Override the mock to simulate an API error
    const createEntityMock = require('../../../../services/SportsDatabaseService').default.createEntity;
    createEntityMock.mockImplementationOnce(() => Promise.reject(new Error('API Error')));
    
    const { result } = renderHook(() => useImportProcess());
    
    const entityType = 'team';
    const mappedData = { name: 'Test Team', city: 'Test City' };
    const currentRecord = { name: 'Test Team', city: 'Test City' };
    
    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveToDatabase(entityType, mappedData, currentRecord);
    });
    
    expect(saveResult).toBe(false);
    expect(result.current.notification?.type).toBe('error');
    expect(result.current.notification?.message).toContain('API Error');
  });
  
  it('should batch import multiple records', async () => {
    const { result } = renderHook(() => useImportProcess());
    
    const entityType = 'team';
    const mappings = { teamName: 'name', teamCity: 'city' };
    const recordsToImport = [
      { teamName: 'Team 1', teamCity: 'City 1' },
      { teamName: 'Team 2', teamCity: 'City 2' }
    ];
    
    let batchResult;
    await act(async () => {
      batchResult = await result.current.batchImport(entityType, mappings, recordsToImport);
    });
    
    expect(batchResult).toEqual({
      success: 2,
      failed: 0,
      total: 2
    });
    expect(result.current.notification?.type).toBe('success');
  });
  
  it('should handle errors during batch import', async () => {
    // Override the mock to simulate an error on the second record
    const createEntityMock = require('../../../../services/SportsDatabaseService').default.createEntity;
    createEntityMock
      .mockImplementationOnce(() => Promise.resolve({ id: '123' }))
      .mockImplementationOnce(() => Promise.reject(new Error('API Error')));
    
    const { result } = renderHook(() => useImportProcess());
    
    const entityType = 'team';
    const mappings = { teamName: 'name', teamCity: 'city' };
    const recordsToImport = [
      { teamName: 'Team 1', teamCity: 'City 1' },
      { teamName: 'Team 2', teamCity: 'City 2' }
    ];
    
    let batchResult;
    await act(async () => {
      batchResult = await result.current.batchImport(entityType, mappings, recordsToImport);
    });
    
    expect(batchResult).toEqual({
      success: 1,
      failed: 1,
      total: 2
    });
    expect(result.current.notification?.type).toBe('info');
    expect(result.current.notification?.message).toContain('1 errors');
  });
}); 