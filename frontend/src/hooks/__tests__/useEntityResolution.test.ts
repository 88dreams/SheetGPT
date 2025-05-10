import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useEntityResolution, useBatchEntityResolution } from '../useEntityResolution';
import { EntityType } from '../../types/sports';

// Mock dependencies
jest.mock('../../../frontend/src/utils/entityResolver', () => ({
  entityResolver: {
    resolveEntity: jest.fn(),
    resolveReferences: jest.fn()
  },
  createMemoEqualityFn: jest.fn((obj) => obj) // Simple passthrough for testing
}));

jest.mock('../../../frontend/src/utils/apiCache', () => ({
  apiCache: {
    get: jest.fn()
  }
}));

jest.mock('../../../frontend/src/utils/fingerprint', () => ({
  createMemoEqualityFn: jest.fn((obj) => obj) // Simple passthrough for testing
}));

describe('useEntityResolution', () => {
  const { entityResolver } = require('../../../frontend/src/utils/entityResolver');
  const { apiCache } = require('../../../frontend/src/utils/apiCache');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useEntityResolution('team', null));
    
    expect(result.current).toEqual({
      entity: null,
      isLoading: false,
      error: null,
      resolutionInfo: {}
    });
    
    // Should not call resolver with null nameOrId
    expect(entityResolver.resolveEntity).not.toHaveBeenCalled();
  });

  it('resolves entity by name or ID', async () => {
    // Mock successful resolution
    const mockEntity = { id: 'team_123', name: 'Test Team', league_id: 'league_456' };
    entityResolver.resolveEntity.mockResolvedValueOnce(mockEntity);
    
    // Mock resolution info in cache
    const mockResolutionInfo = {
      match_score: 0.95,
      fuzzy_matched: true,
      context_matched: false,
      virtual_entity: false,
      resolved_entity_type: 'team',
      resolved_via: 'fuzzy_name_match'
    };
    
    apiCache.get.mockReturnValueOnce({
      resolution_info: mockResolutionInfo
    });
    
    const { result } = renderHook(() => useEntityResolution('team', 'Test Team'));
    
    // Should start loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for resolution to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Should have called resolver with correct parameters
    expect(entityResolver.resolveEntity).toHaveBeenCalledWith(
      'team',
      'Test Team',
      expect.any(Object)
    );
    
    // Should have checked cache for resolution info
    expect(apiCache.get).toHaveBeenCalledWith('resolve_entity_team_Test Team');
    
    // Should have updated state with entity and resolution info
    expect(result.current).toEqual({
      entity: mockEntity,
      isLoading: false,
      error: null,
      resolutionInfo: mockResolutionInfo
    });
  });

  it('handles resolution errors', async () => {
    // Mock resolution error
    const mockError = new Error('Entity not found');
    entityResolver.resolveEntity.mockRejectedValueOnce(mockError);
    
    const { result } = renderHook(() => useEntityResolution('team', 'NonExistentTeam'));
    
    // Should start loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for resolution to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Should have called resolver
    expect(entityResolver.resolveEntity).toHaveBeenCalled();
    
    // Should have updated state with error
    expect(result.current).toEqual({
      entity: null,
      isLoading: false,
      error: mockError,
      resolutionInfo: {}
    });
  });

  it('applies resolution options correctly', async () => {
    // Mock successful resolution
    entityResolver.resolveEntity.mockResolvedValueOnce({ id: 'team_123', name: 'Test Team' });
    
    // Define options
    const options = {
      allowFuzzy: true,
      minimumMatchScore: 0.8,
      throwOnError: true,
      context: { league_id: 'league_123' }
    };
    
    const { result } = renderHook(() => useEntityResolution('team', 'Test Team', options));
    
    // Wait for resolution to complete
    await waitFor(() => {
      expect(entityResolver.resolveEntity).toHaveBeenCalledWith(
        'team',
        'Test Team',
        expect.objectContaining(options)
      );
    });
  });

  it('updates when inputs change', async () => {
    // First resolution
    const mockEntity1 = { id: 'team_123', name: 'Team One' };
    entityResolver.resolveEntity.mockResolvedValueOnce(mockEntity1);
    
    // Mock resolution info
    apiCache.get.mockReturnValueOnce({
      resolution_info: { match_score: 1.0 }
    });
    
    const { result, rerender } = renderHook(
      ({ entityType, nameOrId }) => useEntityResolution(entityType, nameOrId),
      { initialProps: { entityType: 'team' as EntityType, nameOrId: 'Team One' } }
    );
    
    // Wait for first resolution
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Verify first resolution
    expect(result.current.entity).toEqual(mockEntity1);
    
    // Setup second resolution
    const mockEntity2 = { id: 'league_456', name: 'League Two' };
    entityResolver.resolveEntity.mockResolvedValueOnce(mockEntity2);
    
    // Mock different resolution info
    apiCache.get.mockReturnValueOnce({
      resolution_info: { context_matched: true }
    });
    
    // Change props to trigger re-resolution
    rerender({ entityType: 'league' as EntityType, nameOrId: 'League Two' });
    
    // Should start loading again
    expect(result.current.isLoading).toBe(true);
    
    // Wait for second resolution
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have called resolver with new parameters
    expect(entityResolver.resolveEntity).toHaveBeenCalledWith(
      'league',
      'League Two',
      expect.any(Object)
    );
    
    // Should have updated state with new entity
    expect(result.current.entity).toEqual(mockEntity2);
    expect(result.current.resolutionInfo).toEqual({
      matchScore: undefined,
      fuzzyMatched: undefined,
      contextMatched: true,
      virtualEntity: undefined,
      resolvedEntityType: undefined,
      resolvedVia: undefined
    });
  });
});

describe('useBatchEntityResolution', () => {
  const { entityResolver } = require('../../../frontend/src/utils/entityResolver');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useBatchEntityResolution({}));
    
    expect(result.current).toEqual({
      resolved: {},
      errors: {},
      isLoading: false,
      resolveReferences: expect.any(Function)
    });
    
    // Should not call resolver with empty references
    expect(entityResolver.resolveReferences).not.toHaveBeenCalled();
  });

  it('resolves multiple references', async () => {
    // Mock successful batch resolution
    const mockResult = {
      resolved: {
        team: { id: 'team_123', name: 'Test Team' },
        league: { id: 'league_456', name: 'Test League' }
      },
      errors: {}
    };
    
    entityResolver.resolveReferences.mockResolvedValueOnce(mockResult);
    
    // Input references
    const references = {
      team: { name: 'Test Team', type: 'team' as EntityType },
      league: { name: 'Test League', type: 'league' as EntityType }
    };
    
    const { result } = renderHook(() => useBatchEntityResolution(references));
    
    // Should start loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for resolution to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have called batch resolver with correct references
    expect(entityResolver.resolveReferences).toHaveBeenCalledWith(
      references,
      false // default throwOnAnyError
    );
    
    // Should have updated state with resolved entities
    expect(result.current).toEqual({
      resolved: mockResult.resolved,
      errors: {},
      isLoading: false,
      resolveReferences: expect.any(Function)
    });
  });

  it('handles batch resolution errors', async () => {
    // Mock batch resolution with some errors
    const mockResult = {
      resolved: {
        team: { id: 'team_123', name: 'Test Team' }
      },
      errors: {
        league: {
          error: 'not_found',
          message: 'League not found',
          entity_type: 'league',
          name: 'Nonexistent League',
          context: {}
        }
      }
    };
    
    entityResolver.resolveReferences.mockResolvedValueOnce(mockResult);
    
    // Input references
    const references = {
      team: { name: 'Test Team', type: 'team' as EntityType },
      league: { name: 'Nonexistent League', type: 'league' as EntityType }
    };
    
    const { result } = renderHook(() => useBatchEntityResolution(references));
    
    // Wait for resolution to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have updated state with both resolved entities and errors
    expect(result.current).toEqual({
      resolved: mockResult.resolved,
      errors: mockResult.errors,
      isLoading: false,
      resolveReferences: expect.any(Function)
    });
  });

  it('handles complete failure', async () => {
    // Mock complete failure
    const mockError = new Error('Batch resolution failed');
    entityResolver.resolveReferences.mockRejectedValueOnce(mockError);
    
    // Input references
    const references = {
      team: { name: 'Test Team', type: 'team' as EntityType },
      league: { name: 'Test League', type: 'league' as EntityType }
    };
    
    const { result } = renderHook(() => useBatchEntityResolution(references));
    
    // Wait for resolution to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have updated state with error
    expect(result.current).toEqual({
      resolved: {},
      errors: {
        _general: {
          error: 'resolution_failed',
          message: 'Batch resolution failed',
          entity_type: 'unknown',
          name: 'unknown',
          context: {}
        }
      },
      isLoading: false,
      resolveReferences: expect.any(Function)
    });
  });

  it('respects throwOnAnyError parameter', async () => {
    // Input references
    const references = {
      team: { name: 'Test Team', type: 'team' as EntityType }
    };
    
    const { result } = renderHook(() => 
      useBatchEntityResolution(references, true) // throwOnAnyError = true
    );
    
    // Wait for resolution to complete
    await waitFor(() => expect(entityResolver.resolveReferences).toHaveBeenCalledWith(references, true));
  });

  it('provides manual resolution function', async () => {
    // Mock successful resolution
    const mockResult = {
      resolved: { team: { id: 'team_123', name: 'Test Team' } },
      errors: {}
    };
    
    entityResolver.resolveReferences.mockResolvedValueOnce(mockResult);
    
    // Start with empty references
    const { result } = renderHook(() => useBatchEntityResolution({}));
    
    // Should not call resolver initially with empty references
    expect(entityResolver.resolveReferences).not.toHaveBeenCalled();
    
    // Clear mocks to ensure we can track the manual call
    jest.clearAllMocks();
    
    // Setup new mock for manual resolution
    entityResolver.resolveReferences.mockResolvedValueOnce(mockResult);
    
    // Call manual resolution function
    act(() => {
      result.current.resolveReferences();
    });
    
    // Should start loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for resolution to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have called resolver
    expect(entityResolver.resolveReferences).toHaveBeenCalled();
    
    // Should have updated state with resolved entities
    expect(result.current.resolved).toEqual(mockResult.resolved);
  });
});