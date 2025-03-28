import { renderHook, act } from '@testing-library/react-hooks';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import the hook to test
import { useColumnVisibility } from '../../../../../../frontend/src/components/sports/database/EntityList/hooks/useColumnVisibility';

// Mock localStorage and sessionStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock console.error to prevent test output clutter
console.error = jest.fn();

describe('useColumnVisibility Hook', () => {
  const mockTeamEntities = [
    { 
      id: '1', 
      name: 'Team 1', 
      stadium_id: 'stadium1',
      stadium_name: 'Stadium 1',
      league_id: 'league1',
      created_at: '2023-01-01', 
      updated_at: '2023-01-02' 
    }
  ];
  
  const mockBroadcastEntities = [
    { 
      id: '1', 
      name: 'Broadcast 1', 
      broadcast_company_name: 'Broadcast Company',
      entity_name: 'Team 1',
      entity_type: 'team',
      territory: 'US',
      league_name: 'NFL',
      created_at: '2023-01-01', 
      updated_at: '2023-01-02' 
    }
  ];
  
  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default column visibility for regular entities', () => {
    const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
    
    // Check that default visibility is set correctly
    expect(result.current.visibleColumns).toEqual({
      id: false, // UUID field should be hidden by default
      name: true,
      stadium_id: false, // UUID field should be hidden by default
      stadium_name: true,
      league_id: false, // UUID field should be hidden by default
      created_at: true,
      updated_at: true
    });
  });
  
  it('should initialize with special visibility for broadcast entities', () => {
    const { result } = renderHook(() => useColumnVisibility('broadcast', mockBroadcastEntities));
    
    // Check that broadcast-specific fields are visible
    expect(result.current.visibleColumns.broadcast_company_name).toBe(true);
    expect(result.current.visibleColumns.entity_name).toBe(true);
    expect(result.current.visibleColumns.entity_type).toBe(true);
    expect(result.current.visibleColumns.territory).toBe(true);
    expect(result.current.visibleColumns.league_name).toBe(true);
    
    // Check that the generic 'name' field is not present (it's handled specially for broadcast entities)
    expect(result.current.visibleColumns.name).toBeUndefined();
  });
  
  it('should toggle column visibility', () => {
    const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
    
    // Initially, ID should be hidden
    expect(result.current.visibleColumns.id).toBe(false);
    
    // Toggle ID visibility
    act(() => {
      result.current.toggleColumnVisibility('id');
    });
    
    // Now ID should be visible
    expect(result.current.visibleColumns.id).toBe(true);
    
    // Toggle it back
    act(() => {
      result.current.toggleColumnVisibility('id');
    });
    
    // Now ID should be hidden again
    expect(result.current.visibleColumns.id).toBe(false);
  });
  
  it('should show all columns when showAllColumns is called', () => {
    const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
    
    // Initially, some columns should be hidden
    expect(result.current.visibleColumns.id).toBe(false);
    expect(result.current.visibleColumns.stadium_id).toBe(false);
    
    // Show all columns
    act(() => {
      result.current.showAllColumns();
    });
    
    // Now all columns should be visible
    expect(result.current.visibleColumns.id).toBe(true);
    expect(result.current.visibleColumns.name).toBe(true);
    expect(result.current.visibleColumns.stadium_id).toBe(true);
    expect(result.current.visibleColumns.stadium_name).toBe(true);
    expect(result.current.visibleColumns.created_at).toBe(true);
    expect(result.current.visibleColumns.updated_at).toBe(true);
  });
  
  it('should load saved visibility settings from storage', () => {
    // Set up mock storage data
    const savedVisibility = {
      id: true, // Override default
      name: true,
      stadium_id: true, // Override default
      stadium_name: false, // Override default
      league_id: false,
      created_at: true,
      updated_at: true
    };
    
    mockSessionStorage.getItem.mockReturnValueOnce(JSON.stringify(savedVisibility));
    
    const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
    
    // Check that saved visibility is loaded correctly
    expect(result.current.visibleColumns).toEqual(savedVisibility);
  });
  
  it('should save visibility settings to both localStorage and sessionStorage', () => {
    const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
    
    // Toggle a column to trigger the save effect
    act(() => {
      result.current.toggleColumnVisibility('id');
    });
    
    // Check that visibility was saved to both storages with the correct key
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'entityList_team_columns',
      expect.any(String)
    );
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'entityList_team_columns',
      expect.any(String)
    );
    
    // Parse the saved JSON to verify content
    const savedValue = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
    expect(savedValue.id).toBe(true); // We toggled this from false to true
  });
  
  it('should handle empty or invalid entities array', () => {
    // Test with empty array
    const { result: emptyResult } = renderHook(() => useColumnVisibility('team', []));
    expect(emptyResult.current.visibleColumns).toEqual({});
    
    // Test with null
    const { result: nullResult } = renderHook(() => useColumnVisibility('team', null as any));
    expect(nullResult.current.visibleColumns).toEqual({});
  });
  
  it('should handle corrupted storage data gracefully', () => {
    // Set up corrupted storage data
    mockSessionStorage.getItem.mockReturnValueOnce('not valid json');
    
    // Should not throw and should fall back to defaults
    const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
    
    // Check that default visibility is set
    expect(result.current.visibleColumns.name).toBe(true);
    expect(result.current.visibleColumns.id).toBe(false);
    
    // Should log an error
    expect(console.error).toHaveBeenCalled();
  });
});