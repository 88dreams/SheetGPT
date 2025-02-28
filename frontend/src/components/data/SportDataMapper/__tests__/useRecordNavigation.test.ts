import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import useRecordNavigation from '../hooks/useRecordNavigation';

describe('useRecordNavigation', () => {
  const mockData = [
    { id: 1, name: 'Record 1' },
    { id: 2, name: 'Record 2' },
    { id: 3, name: 'Record 3' },
  ];

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useRecordNavigation(mockData));
    
    expect(result.current.currentRecordIndex).toBe(0);
    expect(result.current.totalRecords).toBe(3);
    expect(result.current.includedRecordsCount).toBe(3);
    expect(result.current.excludedRecords.size).toBe(0);
  });
  
  it('should navigate to next record', () => {
    const { result } = renderHook(() => useRecordNavigation(mockData));
    
    // Initial index is 0
    expect(result.current.currentRecordIndex).toBe(0);
    
    // Navigate to next record
    act(() => {
      result.current.goToNextRecord();
    });
    
    expect(result.current.currentRecordIndex).toBe(1);
    
    // Navigate to next record again
    act(() => {
      result.current.goToNextRecord();
    });
    
    expect(result.current.currentRecordIndex).toBe(2);
    
    // Try to navigate past the end
    act(() => {
      result.current.goToNextRecord();
    });
    
    // Should stay at the last record
    expect(result.current.currentRecordIndex).toBe(2);
  });
  
  it('should navigate to previous record', () => {
    const { result } = renderHook(() => useRecordNavigation(mockData));
    
    // Set initial index to 2
    act(() => {
      result.current.setCurrentRecordIndex(2);
    });
    
    expect(result.current.currentRecordIndex).toBe(2);
    
    // Navigate to previous record
    act(() => {
      result.current.goToPreviousRecord();
    });
    
    expect(result.current.currentRecordIndex).toBe(1);
    
    // Navigate to previous record again
    act(() => {
      result.current.goToPreviousRecord();
    });
    
    expect(result.current.currentRecordIndex).toBe(0);
    
    // Try to navigate before the beginning
    act(() => {
      result.current.goToPreviousRecord();
    });
    
    // Should stay at the first record
    expect(result.current.currentRecordIndex).toBe(0);
  });
  
  it('should toggle exclude record', () => {
    const { result } = renderHook(() => useRecordNavigation(mockData));
    
    // Initially no records are excluded
    expect(result.current.excludedRecords.size).toBe(0);
    expect(result.current.isCurrentRecordExcluded()).toBe(false);
    
    // Exclude the current record (index 0)
    act(() => {
      result.current.toggleExcludeRecord();
    });
    
    expect(result.current.excludedRecords.size).toBe(1);
    expect(result.current.isCurrentRecordExcluded()).toBe(true);
    
    // Toggle again to include the record
    act(() => {
      result.current.toggleExcludeRecord();
    });
    
    expect(result.current.excludedRecords.size).toBe(0);
    expect(result.current.isCurrentRecordExcluded()).toBe(false);
  });
  
  it('should get current record', () => {
    const { result } = renderHook(() => useRecordNavigation(mockData));
    
    expect(result.current.getCurrentRecord()).toEqual(mockData[0]);
    
    act(() => {
      result.current.goToNextRecord();
    });
    
    expect(result.current.getCurrentRecord()).toEqual(mockData[1]);
  });
  
  it('should get included records', () => {
    const { result } = renderHook(() => useRecordNavigation(mockData));
    
    // Initially all records should be included
    const initialIncluded = result.current.getIncludedRecords();
    expect(initialIncluded).toHaveLength(3);
    expect(initialIncluded).toEqual(mockData);
    
    // Exclude the first record (index 0)
    act(() => {
      result.current.setCurrentRecordIndex(0);
    });
    
    act(() => {
      result.current.toggleExcludeRecord();
    });
    
    // Check that the first record is excluded
    const includedAfterFirstExclusion = result.current.getIncludedRecords();
    expect(includedAfterFirstExclusion).toHaveLength(2);
    expect(includedAfterFirstExclusion).toEqual([mockData[1], mockData[2]]);
    
    // Exclude the second record (index 1)
    act(() => {
      result.current.setCurrentRecordIndex(1);
    });
    
    act(() => {
      result.current.toggleExcludeRecord();
    });
    
    // Now only the third record should remain
    const finalIncluded = result.current.getIncludedRecords();
    expect(finalIncluded).toHaveLength(1);
    expect(finalIncluded).toEqual([mockData[2]]);
    
    // Check that the excluded records set has the correct indices
    expect(result.current.excludedRecords.has(0)).toBe(true);
    expect(result.current.excludedRecords.has(1)).toBe(true);
    expect(result.current.excludedRecords.has(2)).toBe(false);
  });
}); 