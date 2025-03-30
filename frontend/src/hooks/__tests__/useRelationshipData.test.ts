import { renderHook, act } from '@testing-library/react-hooks';
import { useRelationshipData, useCommonEntityData, useEntityRelationships } from '../useRelationshipData';
import { relationshipLoader } from '../../utils/relationshipLoader';

// Mock the relationshipLoader
jest.mock('../../utils/relationshipLoader', () => ({
  relationshipLoader: {
    _fetchEntitiesWithFilter: jest.fn(),
    loadRelationships: jest.fn(),
    loadRelationshipsForMultiple: jest.fn(),
    preloadEntitySet: jest.fn(),
    clearCache: jest.fn(),
    clearAllCache: jest.fn(),
  },
  COMMON_ENTITY_SETS: {
    FORM_BASICS: ['league', 'division_conference', 'team', 'stadium', 'brand'],
    MEDIA_ENTITIES: ['brand', 'broadcast', 'production', 'game_broadcast'],
  },
  COMMON_RELATIONSHIPS: {
    league: [
      {
        entityType: 'league',
        idField: 'id',
        relatedEntityType: 'division_conference',
        filterField: 'league_id'
      }
    ]
  }
}));

describe('useRelationshipData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should load data on mount when loadOnMount is true', async () => {
    // Mock the _fetchEntitiesWithFilter method
    const mockLeagues = [{ id: 'l1', name: 'League 1' }];
    (relationshipLoader._fetchEntitiesWithFilter as jest.Mock).mockResolvedValue(mockLeagues);
    
    // Mock the loadRelationshipsForMultiple method
    const mockRelationships = {
      'l1': {
        division_conference: [{ id: 'd1', name: 'Division 1' }]
      }
    };
    (relationshipLoader.loadRelationshipsForMultiple as jest.Mock).mockResolvedValue(mockRelationships);
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useRelationshipData('league', ['l1'])
    );
    
    // Check initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the data was loaded
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entitiesByType).toEqual({ league: mockLeagues });
    expect(result.current.relationshipsByEntityId).toEqual(mockRelationships);
    expect(result.current.leagues).toEqual(mockLeagues);
    
    // Check that the loader methods were called
    expect(relationshipLoader._fetchEntitiesWithFilter).toHaveBeenCalledWith(
      'league', 'id', 'l1', true
    );
    expect(relationshipLoader.loadRelationshipsForMultiple).toHaveBeenCalledWith(
      mockLeagues, 'league', undefined, true
    );
  });
  
  it('should not load data on mount when loadOnMount is false', () => {
    // Render the hook
    renderHook(() => 
      useRelationshipData('league', ['l1'], { loadOnMount: false })
    );
    
    // Check that the loader methods were not called
    expect(relationshipLoader._fetchEntitiesWithFilter).not.toHaveBeenCalled();
    expect(relationshipLoader.loadRelationshipsForMultiple).not.toHaveBeenCalled();
  });
  
  it('should preload entity set when preloadSet is provided', async () => {
    // Mock the preloadEntitySet method
    const mockEntities = {
      league: [{ id: 'l1', name: 'League 1' }],
      division_conference: [{ id: 'd1', name: 'Division 1' }]
    };
    (relationshipLoader.preloadEntitySet as jest.Mock).mockResolvedValue(mockEntities);
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useRelationshipData('league', [], { preloadSet: 'FORM_BASICS' })
    );
    
    // Check initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the data was loaded
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entitiesByType).toEqual(mockEntities);
    expect(result.current.leagues).toEqual(mockEntities.league);
    expect(result.current.divisions_conferences).toEqual(mockEntities.division_conference);
    
    // Check that the preloadEntitySet method was called
    expect(relationshipLoader.preloadEntitySet).toHaveBeenCalledWith(
      'FORM_BASICS', 200, true
    );
  });
  
  it('should reload data when reload is called', async () => {
    // Mock the _fetchEntitiesWithFilter method
    const mockLeagues = [{ id: 'l1', name: 'League 1' }];
    (relationshipLoader._fetchEntitiesWithFilter as jest.Mock).mockResolvedValue(mockLeagues);
    
    // Mock the loadRelationshipsForMultiple method
    const mockRelationships = {
      'l1': {
        division_conference: [{ id: 'd1', name: 'Division 1' }]
      }
    };
    (relationshipLoader.loadRelationshipsForMultiple as jest.Mock).mockResolvedValue(mockRelationships);
    
    // Render the hook with loadOnMount: false
    const { result, waitForNextUpdate } = renderHook(() => 
      useRelationshipData('league', ['l1'], { loadOnMount: false })
    );
    
    // Check initial state
    expect(result.current.isLoading).toBe(false);
    
    // Call reload
    act(() => {
      result.current.reload();
    });
    
    // Check that loading state was updated
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the data was loaded
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entitiesByType).toEqual({ league: mockLeagues });
    expect(result.current.relationshipsByEntityId).toEqual(mockRelationships);
    
    // Check that the loader methods were called
    expect(relationshipLoader._fetchEntitiesWithFilter).toHaveBeenCalledWith(
      'league', 'id', 'l1', true
    );
    expect(relationshipLoader.loadRelationshipsForMultiple).toHaveBeenCalledWith(
      mockLeagues, 'league', undefined, true
    );
  });
  
  it('should handle errors gracefully', async () => {
    // Mock the _fetchEntitiesWithFilter method to throw an error
    const mockError = new Error('API error');
    (relationshipLoader._fetchEntitiesWithFilter as jest.Mock).mockRejectedValue(mockError);
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useRelationshipData('league', ['l1'])
    );
    
    // Check initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    
    // Wait for the error to be caught
    await waitForNextUpdate();
    
    // Check that the error was caught
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.entitiesByType).toEqual({});
    expect(result.current.relationshipsByEntityId).toEqual({});
  });
});

describe('useCommonEntityData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should preload common entity data with default set', async () => {
    // Mock the preloadEntitySet method
    const mockEntities = {
      league: [{ id: 'l1', name: 'League 1' }],
      division_conference: [{ id: 'd1', name: 'Division 1' }]
    };
    (relationshipLoader.preloadEntitySet as jest.Mock).mockResolvedValue(mockEntities);
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useCommonEntityData()
    );
    
    // Check initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the data was loaded
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entitiesByType).toEqual(mockEntities);
    
    // Check that the preloadEntitySet method was called with the default set
    expect(relationshipLoader.preloadEntitySet).toHaveBeenCalledWith(
      'FORM_BASICS', 200, true
    );
  });
  
  it('should preload common entity data with custom set', async () => {
    // Mock the preloadEntitySet method
    const mockEntities = {
      brand: [{ id: 'b1', name: 'Brand 1' }],
      broadcast: [{ id: 'br1', name: 'Broadcast 1' }]
    };
    (relationshipLoader.preloadEntitySet as jest.Mock).mockResolvedValue(mockEntities);
    
    // Render the hook with custom set
    const { result, waitForNextUpdate } = renderHook(() => 
      useCommonEntityData('MEDIA_ENTITIES')
    );
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the preloadEntitySet method was called with the custom set
    expect(relationshipLoader.preloadEntitySet).toHaveBeenCalledWith(
      'MEDIA_ENTITIES', 200, true
    );
  });
});

describe('useEntityRelationships', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should load relationships for a single entity', async () => {
    // Mock the _fetchEntitiesWithFilter method
    const mockLeagues = [{ id: 'l1', name: 'League 1' }];
    (relationshipLoader._fetchEntitiesWithFilter as jest.Mock).mockResolvedValue(mockLeagues);
    
    // Mock the loadRelationshipsForMultiple method
    const mockRelationships = {
      'l1': {
        division_conference: [{ id: 'd1', name: 'Division 1' }]
      }
    };
    (relationshipLoader.loadRelationshipsForMultiple as jest.Mock).mockResolvedValue(mockRelationships);
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useEntityRelationships('league', 'l1')
    );
    
    // Check initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the data was loaded
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entity).toEqual(mockLeagues[0]);
    expect(result.current.relationships).toEqual(mockRelationships['l1']);
    
    // Check that the loader methods were called
    expect(relationshipLoader._fetchEntitiesWithFilter).toHaveBeenCalledWith(
      'league', 'id', 'l1', true
    );
    expect(relationshipLoader.loadRelationshipsForMultiple).toHaveBeenCalledWith(
      mockLeagues, 'league', undefined, true
    );
  });
  
  it('should handle missing entity ID gracefully', () => {
    // Render the hook without an entity ID
    const { result } = renderHook(() => 
      useEntityRelationships('league')
    );
    
    // Check that the hook returned empty data
    expect(result.current.entity).toBe(null);
    expect(result.current.relationships).toEqual({});
    
    // Check that no loader methods were called
    expect(relationshipLoader._fetchEntitiesWithFilter).not.toHaveBeenCalled();
    expect(relationshipLoader.loadRelationshipsForMultiple).not.toHaveBeenCalled();
  });
  
  it('should handle entity not found gracefully', async () => {
    // Mock the _fetchEntitiesWithFilter method to return an empty array
    (relationshipLoader._fetchEntitiesWithFilter as jest.Mock).mockResolvedValue([]);
    
    // Mock the loadRelationshipsForMultiple method
    (relationshipLoader.loadRelationshipsForMultiple as jest.Mock).mockResolvedValue({});
    
    // Render the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useEntityRelationships('league', 'l1')
    );
    
    // Wait for the data to load
    await waitForNextUpdate();
    
    // Check that the hook returned empty data
    expect(result.current.entity).toBe(null);
    expect(result.current.relationships).toEqual({});
  });
});