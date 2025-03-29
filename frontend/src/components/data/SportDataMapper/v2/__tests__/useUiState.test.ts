import { renderHook } from '@testing-library/react';
import useUiState from '../hooks/useUiState';

// With React 18, we can use the async version of act from React Testing Library directly
import { act } from 'react-dom/test-utils';

describe('useUiState hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUiState());
    
    // Check initial state values
    expect(result.current.viewMode).toBe('entity');
    expect(result.current.showGuidedWalkthrough).toBe(false);
    expect(result.current.guidedStep).toBe(1);
    expect(result.current.showFieldHelp).toBeNull();
    expect(result.current.validStructuredData).toBe(true);
    expect(result.current.isEntityUpdateMode).toBe(false);
  });
  
  it('should initialize with provided values', () => {
    const initialState = {
      viewMode: 'field' as const,
      showGuidedWalkthrough: true,
      guidedStep: 3,
      showFieldHelp: 'name',
      validStructuredData: false,
      isEntityUpdateMode: true
    };
    
    const { result } = renderHook(() => useUiState(initialState));
    
    // Check that initial values were applied
    expect(result.current.viewMode).toBe('field');
    expect(result.current.showGuidedWalkthrough).toBe(true);
    expect(result.current.guidedStep).toBe(3);
    expect(result.current.showFieldHelp).toBe('name');
    expect(result.current.validStructuredData).toBe(false);
    expect(result.current.isEntityUpdateMode).toBe(true);
  });
  
  it('should toggle view mode correctly', async () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value should be 'entity'
    expect(result.current.viewMode).toBe('entity');
    
    // First toggle: entity -> field
    await act(async () => {
      result.current.toggleViewMode();
    });
    expect(result.current.viewMode).toBe('field');
    
    // Second toggle: field -> global
    await act(async () => {
      result.current.toggleViewMode();
    });
    expect(result.current.viewMode).toBe('global');
    
    // Third toggle: global -> entity
    await act(async () => {
      result.current.toggleViewMode();
    });
    expect(result.current.viewMode).toBe('entity');
  });
  
  it('should start and end guided walkthrough', async () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial values
    expect(result.current.showGuidedWalkthrough).toBe(false);
    expect(result.current.guidedStep).toBe(1);
    
    // Start walkthrough
    await act(async () => {
      result.current.startGuidedWalkthrough();
    });
    expect(result.current.showGuidedWalkthrough).toBe(true);
    expect(result.current.guidedStep).toBe(1);
    
    // Navigate to next step
    await act(async () => {
      result.current.nextGuidedStep();
    });
    expect(result.current.guidedStep).toBe(2);
    
    // Navigate to previous step
    await act(async () => {
      result.current.previousGuidedStep();
    });
    expect(result.current.guidedStep).toBe(1);
    
    // Previous step doesn't go below 1
    await act(async () => {
      result.current.previousGuidedStep();
    });
    expect(result.current.guidedStep).toBe(1);
    
    // End walkthrough
    await act(async () => {
      result.current.endGuidedWalkthrough();
    });
    expect(result.current.showGuidedWalkthrough).toBe(false);
    expect(result.current.guidedStep).toBe(1);
  });
  
  it('should show and hide field help', async () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value
    expect(result.current.showFieldHelp).toBeNull();
    
    // Show help for a field
    await act(async () => {
      result.current.showHelpForField('name');
    });
    expect(result.current.showFieldHelp).toBe('name');
    
    // Hide field help
    await act(async () => {
      result.current.hideFieldHelp();
    });
    expect(result.current.showFieldHelp).toBeNull();
  });
  
  it('should set data validity', async () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value
    expect(result.current.validStructuredData).toBe(true);
    
    // Set to invalid
    await act(async () => {
      result.current.setDataValidity(false);
    });
    expect(result.current.validStructuredData).toBe(false);
    
    // Set back to valid
    await act(async () => {
      result.current.setDataValidity(true);
    });
    expect(result.current.validStructuredData).toBe(true);
  });
  
  it('should toggle entity update mode', async () => {
    const { result } = renderHook(() => useUiState());
    
    // Initial value
    expect(result.current.isEntityUpdateMode).toBe(false);
    
    // Toggle on
    await act(async () => {
      result.current.toggleEntityUpdateMode();
    });
    expect(result.current.isEntityUpdateMode).toBe(true);
    
    // Toggle off
    await act(async () => {
      result.current.toggleEntityUpdateMode();
    });
    expect(result.current.isEntityUpdateMode).toBe(false);
  });
});