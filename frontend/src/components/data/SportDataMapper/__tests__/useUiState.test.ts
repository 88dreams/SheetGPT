import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import useUiState from '../hooks/useUiState';

describe('useUiState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUiState());
    
    expect(result.current.viewMode).toBe('entity');
    expect(result.current.showGuidedWalkthrough).toBe(false);
    expect(result.current.guidedStep).toBe(1);
    expect(result.current.showFieldHelp).toBeNull();
    expect(result.current.validStructuredData).toBe(true);
  });
  
  it('should toggle view mode', () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value is 'entity'
    expect(result.current.viewMode).toBe('entity');
    
    // Toggle to 'field'
    act(() => {
      result.current.toggleViewMode();
    });
    
    expect(result.current.viewMode).toBe('field');
    
    // Toggle to 'global'  
    act(() => {
      result.current.toggleViewMode();
    });
    
    expect(result.current.viewMode).toBe('global');
  });
  
  it('should start and end guided walkthrough', () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial values
    expect(result.current.showGuidedWalkthrough).toBe(false);
    expect(result.current.guidedStep).toBe(1);
    
    // Start guided walkthrough
    act(() => {
      result.current.startGuidedWalkthrough();
    });
    
    expect(result.current.showGuidedWalkthrough).toBe(true);
    expect(result.current.guidedStep).toBe(1);
    
    // End guided walkthrough
    act(() => {
      result.current.endGuidedWalkthrough();
    });
    
    expect(result.current.showGuidedWalkthrough).toBe(false);
    expect(result.current.guidedStep).toBe(1);
  });
  
  it('should navigate through guided steps', () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value
    expect(result.current.guidedStep).toBe(1);
    
    // Go to next step
    act(() => {
      result.current.nextGuidedStep();
    });
    
    expect(result.current.guidedStep).toBe(2);
    
    // Go to previous step
    act(() => {
      result.current.previousGuidedStep();
    });
    
    expect(result.current.guidedStep).toBe(1);
    
    // Should not go below 1
    act(() => {
      result.current.previousGuidedStep();
    });
    
    expect(result.current.guidedStep).toBe(1);
  });
  
  it('should show and hide field help', () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value
    expect(result.current.showFieldHelp).toBeNull();
    
    // Show help for a field
    act(() => {
      result.current.showHelpForField('name');
    });
    
    expect(result.current.showFieldHelp).toBe('name');
    
    // Hide field help
    act(() => {
      result.current.hideFieldHelp();
    });
    
    expect(result.current.showFieldHelp).toBeNull();
  });
  
  it('should set data validity', () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value
    expect(result.current.validStructuredData).toBe(true);
    
    // Set to invalid
    act(() => {
      result.current.setDataValidity(false);
    });
    
    expect(result.current.validStructuredData).toBe(false);
    
    // Set back to valid
    act(() => {
      result.current.setDataValidity(true);
    });
    
    expect(result.current.validStructuredData).toBe(true);
  });
}); 