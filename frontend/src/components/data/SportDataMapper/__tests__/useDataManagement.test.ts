import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import useDataManagement from '../hooks/useDataManagement';
import { EntityType } from '../../../../utils/sportDataMapper';

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

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useDataManagement());
    
    expect(result.current.dataToImport).toEqual([]);
    expect(result.current.sourceFields).toEqual([]);
    expect(result.current.sourceFieldValues).toEqual({});
    expect(result.current.mappedData).toEqual({});
  });
  
  it('should extract source fields from structured data', () => {
    const { result } = renderHook(() => useDataManagement());
    const setDataValidityMock = jest.fn();
    
    act(() => {
      result.current.extractSourceFields(mockData, setDataValidityMock);
    });
    
    expect(setDataValidityMock).toHaveBeenCalledWith(true);
    expect(result.current.dataToImport).toEqual(mockData);
    expect(result.current.sourceFields).toEqual(['id', 'name', 'city']);
    expect(result.current.sourceFieldValues).toEqual(mockData[0]);
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
  
  it('should update mapped data for entity type', () => {
    const { result } = renderHook(() => useDataManagement());
    
    // Set data to import
    act(() => {
      result.current.setDataToImport(mockData);
    });
    
    // Update mapped data for entity type
    act(() => {
      result.current.updateMappedDataForEntityType('team' as EntityType, mockMappings, 0);
    });
    
    expect(result.current.mappedData).toEqual({
      name: 'Record 1',
      city: 'New York'
    });
  });
  
  it('should update source field values for a record', () => {
    const { result } = renderHook(() => useDataManagement());
    
    // Set data to import
    act(() => {
      result.current.setDataToImport(mockData);
    });
    
    // Update source field values for record index 1
    act(() => {
      result.current.updateSourceFieldValues(1);
    });
    
    expect(result.current.sourceFieldValues).toEqual(mockData[1]);
  });
  
  it('should update mapped data for a field', () => {
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
    
    // Update another field
    act(() => {
      result.current.updateMappedDataForField('city', 'teamCity', 0);
    });
    
    expect(result.current.mappedData).toEqual({
      teamName: 'Record 1',
      teamCity: 'New York'
    });
  });
  
  it('should clear mapped data', () => {
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
    
    // Clear mapped data
    act(() => {
      result.current.clearMappedData();
    });
    
    expect(result.current.mappedData).toEqual({});
  });
}); 