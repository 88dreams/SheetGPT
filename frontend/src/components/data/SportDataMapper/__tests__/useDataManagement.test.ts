import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import useDataManagement from '../hooks/useDataManagement';
import { EntityType } from '../../../../utils/sportDataMapper';

// Mock the fingerprinting utility
jest.mock('../../../../utils/fingerprint', () => ({
  fingerprint: jest.fn(obj => JSON.stringify(obj)),
  areEqual: jest.fn((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  createMemoEqualityFn: jest.fn((a) => (b) => JSON.stringify(a) === JSON.stringify(b))
}));

describe('useDataManagement', () => {
  const mockData = [
    { id: 1, name: 'Record 1', city: 'New York' },
    { id: 2, name: 'Record 2', city: 'Los Angeles' },
    { id: 3, name: 'Record 3', city: 'Chicago' },
  ];

  const mockMappings = {
    team: {
      name: 'name',
      city: 'city'
    }
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useDataManagement());
    
    expect(result.current.dataToImport).toEqual([]);
    expect(result.current.sourceFields).toEqual([]);
    expect(result.current.sourceFieldValues).toEqual({});
    expect(result.current.mappedData).toEqual({});
  });
  
  it('should extract source fields from structured data with fingerprinting', () => {
    const { result } = renderHook(() => useDataManagement());
    const setDataValidityMock = jest.fn();
    
    act(() => {
      result.current.extractSourceFields(mockData, setDataValidityMock);
    });
    
    // Check that fingerprint was used
    expect(require('../../../../utils/fingerprint').fingerprint).toHaveBeenCalled();
    
    expect(setDataValidityMock).toHaveBeenCalledWith(true);
    expect(result.current.dataToImport).toEqual(mockData);
    expect(result.current.sourceFields).toEqual(['id', 'name', 'city']);
    expect(result.current.sourceFieldValues).toEqual(mockData[0]);
  });
  
  it('should skip extraction for unchanged data', () => {
    const { result } = renderHook(() => useDataManagement());
    const setDataValidityMock = jest.fn();
    
    // First extraction
    act(() => {
      result.current.extractSourceFields(mockData, setDataValidityMock);
    });
    
    // Reset mock counts
    setDataValidityMock.mockClear();
    (require('../../../../utils/fingerprint').fingerprint as jest.Mock).mockClear();
    
    // Second extraction with same data
    act(() => {
      result.current.extractSourceFields(mockData, setDataValidityMock);
    });
    
    // Fingerprint should be called for the check, but no state updates should happen
    expect(require('../../../../utils/fingerprint').fingerprint).toHaveBeenCalled();
    expect(setDataValidityMock).not.toHaveBeenCalled();
  });
  
  it('should handle invalid data', () => {
    const { result } = renderHook(() => useDataManagement());
    const setDataValidityMock = jest.fn();
    
    act(() => {
      result.current.extractSourceFields(null, setDataValidityMock);
    });
    
    expect(setDataValidityMock).toHaveBeenCalledWith(false);
    expect(result.current.dataToImport).toEqual([]);
  });
  
  it('should update mapped data for entity type using fingerprinting for equality check', () => {
    const { result } = renderHook(() => useDataManagement());
    
    // Set data to import
    act(() => {
      result.current.setDataToImport(mockData);
    });
    
    // Reset fingerprint mock
    (require('../../../../utils/fingerprint').fingerprint as jest.Mock).mockClear();
    
    // Update mapped data for entity type
    act(() => {
      result.current.updateMappedDataForEntityType('team' as EntityType, mockMappings, 0);
    });
    
    // Check that fingerprint was used
    expect(require('../../../../utils/fingerprint').areEqual).toHaveBeenCalled();
    
    expect(result.current.mappedData).toEqual({
      name: 'Record 1',
      city: 'New York'
    });
  });
  
  it('should optimize update source field values with requestAnimationFrame', () => {
    const { result } = renderHook(() => useDataManagement());
    
    // Set data to import
    act(() => {
      result.current.setDataToImport(mockData);
    });
    
    // Reset fingerprint mock
    (require('../../../../utils/fingerprint').fingerprint as jest.Mock).mockClear();
    
    // Update source field values for record index 1
    act(() => {
      result.current.updateSourceFieldValues(1);
    });
    
    // Check that fingerprint and rAF were used
    expect(require('../../../../utils/fingerprint').fingerprint).toHaveBeenCalled();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    
    expect(result.current.sourceFieldValues).toEqual(mockData[1]);
  });
  
  it('should skip update for unchanged source field values', () => {
    const { result } = renderHook(() => useDataManagement());
    
    // Set data to import
    act(() => {
      result.current.setDataToImport(mockData);
    });
    
    // Set source field values to record 0
    act(() => {
      result.current.updateSourceFieldValues(0);
    });
    
    // Reset mocks
    (require('../../../../utils/fingerprint').fingerprint as jest.Mock).mockClear();
    (window.requestAnimationFrame as jest.Mock).mockClear();
    
    // Try updating with the same data
    act(() => {
      result.current.updateSourceFieldValues(0);
    });
    
    // Fingerprint should be called for the comparison, but no state update should happen
    expect(require('../../../../utils/fingerprint').fingerprint).toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
  
  it('should update mapped data for a field with optimized state updates', () => {
    const { result } = renderHook(() => useDataManagement());
    
    // Set data to import
    act(() => {
      result.current.setDataToImport(mockData);
    });
    
    // Update mapped data for a field
    act(() => {
      result.current.updateMappedDataForField('name', 'teamName', 0);
    });
    
    expect(result.current.mappedData).toEqual({
      teamName: 'Record 1'
    });
    
    // Update with the same field and value again
    const setMappedDataSpy = jest.spyOn(result.current, 'setMappedData');
    
    act(() => {
      // This should be a no-op since the value hasn't changed
      result.current.updateMappedDataForField('name', 'teamName', 0);
    });
    
    // setMappedData should only be called once because the value hasn't changed
    expect(setMappedDataSpy).not.toHaveBeenCalled();
  });
  
  it('should memoize data arrays for stable references', () => {
    // Mock React.useMemo
    const useMemoSpy = jest.spyOn(React, 'useMemo').mockImplementation((fn) => fn());
    
    renderHook(() => useDataManagement());
    
    // Check that useMemo was called for memoization
    expect(useMemoSpy).toHaveBeenCalledTimes(2); // For sourceFields and dataToImport
    
    useMemoSpy.mockRestore();
  });
});