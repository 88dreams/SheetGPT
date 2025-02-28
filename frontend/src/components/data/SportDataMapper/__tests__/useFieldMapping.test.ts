import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import useFieldMapping from '../hooks/useFieldMapping';
import { EntityType } from '../../../../utils/sportDataMapper';

describe('useFieldMapping', () => {
  it('should initialize with empty mappings', () => {
    const { result } = renderHook(() => useFieldMapping());
    
    expect(result.current.mappingsByEntityType).toEqual({});
    expect(result.current.selectedEntityType).toBeNull();
  });
  
  it('should initialize with provided entity type', () => {
    const initialEntityType: EntityType = 'team';
    const { result } = renderHook(() => useFieldMapping(initialEntityType));
    
    expect(result.current.selectedEntityType).toBe(initialEntityType);
  });
  
  it('should handle field mapping', () => {
    const initialEntityType: EntityType = 'team';
    const { result } = renderHook(() => useFieldMapping(initialEntityType));
    
    act(() => {
      result.current.handleFieldMapping('teamName', 'name');
    });
    
    expect(result.current.mappingsByEntityType[initialEntityType]).toEqual({
      name: 'teamName'
    });
  });
  
  it('should clear mappings', () => {
    const initialEntityType: EntityType = 'team';
    const { result } = renderHook(() => useFieldMapping(initialEntityType));
    
    // Add a mapping
    act(() => {
      result.current.handleFieldMapping('teamName', 'name');
    });
    
    // Verify mapping exists
    expect(result.current.mappingsByEntityType[initialEntityType]).toEqual({
      name: 'teamName'
    });
    
    // Clear mappings
    act(() => {
      result.current.clearMappings();
    });
    
    // Verify mappings are cleared
    expect(result.current.mappingsByEntityType[initialEntityType]).toEqual({});
  });
  
  it('should remove a specific mapping', () => {
    const initialEntityType: EntityType = 'team';
    const { result } = renderHook(() => useFieldMapping(initialEntityType));
    
    // Add mappings
    act(() => {
      result.current.handleFieldMapping('teamName', 'name');
      result.current.handleFieldMapping('teamCity', 'city');
    });
    
    // Verify mappings exist
    expect(result.current.mappingsByEntityType[initialEntityType]).toEqual({
      name: 'teamName',
      city: 'teamCity'
    });
    
    // Remove a specific mapping
    act(() => {
      result.current.removeMapping('name');
    });
    
    // Verify the mapping was removed
    expect(result.current.mappingsByEntityType[initialEntityType]).toEqual({
      city: 'teamCity'
    });
  });
  
  it('should get current mappings', () => {
    const initialEntityType: EntityType = 'team';
    const { result } = renderHook(() => useFieldMapping(initialEntityType));
    
    // Add mappings
    act(() => {
      result.current.handleFieldMapping('teamName', 'name');
      result.current.handleFieldMapping('teamCity', 'city');
    });
    
    // Get current mappings
    const currentMappings = result.current.getCurrentMappings();
    
    // Verify the current mappings
    expect(currentMappings).toEqual({
      name: 'teamName',
      city: 'teamCity'
    });
  });
  
  it('should change selected entity type', () => {
    const initialEntityType: EntityType = 'team';
    const { result } = renderHook(() => useFieldMapping(initialEntityType));
    
    // Change entity type
    act(() => {
      result.current.setSelectedEntityType('league');
    });
    
    // Verify entity type changed
    expect(result.current.selectedEntityType).toBe('league');
  });
}); 