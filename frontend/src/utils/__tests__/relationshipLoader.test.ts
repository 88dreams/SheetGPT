import { relationshipLoader, RelationshipLoader, COMMON_RELATIONSHIPS } from '../relationshipLoader';
import sportsService from '../../services/sportsService';
import { apiCache } from '../apiCache';

// Mock the sportsService and apiCache
jest.mock('../../services/sportsService');
jest.mock('../apiCache', () => ({
  apiCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    keys: jest.fn(),
  },
}));

describe('RelationshipLoader', () => {
  let loader: RelationshipLoader;
  
  beforeEach(() => {
    // Create a new instance for each test
    loader = new RelationshipLoader();
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Mock apiCache.keys to return an empty array
    (apiCache.keys as jest.Mock).mockReturnValue([]);
  });
  
  describe('_fetchEntitiesWithFilter', () => {
    it('should fetch entities with the given filter', async () => {
      // Mock the getEntities method
      const mockItems = [{ id: '1', name: 'Test Entity' }];
      const mockResponse = { items: mockItems, total: 1, page: 1, pageSize: 50, totalPages: 1 };
      (sportsService.getEntities as jest.Mock).mockResolvedValue(mockResponse);
      
      // Call the method
      const result = await (loader as any)._fetchEntitiesWithFilter('league', 'id', '1');
      
      // Check the result
      expect(result).toEqual(mockItems);
      
      // Check that getEntities was called with the correct parameters
      expect(sportsService.getEntities).toHaveBeenCalledWith('league', [
        { field: 'id', operator: 'eq', value: '1' }
      ]);
      
      // Check that the result was cached
      expect(apiCache.set).toHaveBeenCalledWith('relationship_league_id_1', mockItems);
    });
    
    it('should use cached results when available', async () => {
      // Mock the cache
      const mockItems = [{ id: '1', name: 'Cached Entity' }];
      (apiCache.get as jest.Mock).mockReturnValueOnce(mockItems);
      
      // Call the method
      const result = await (loader as any)._fetchEntitiesWithFilter('league', 'id', '1');
      
      // Check the result
      expect(result).toEqual(mockItems);
      
      // Check that getEntities was not called
      expect(sportsService.getEntities).not.toHaveBeenCalled();
    });
    
    it('should deduplicate in-flight requests', async () => {
      // Mock the getEntities method to delay
      const mockItems = [{ id: '1', name: 'Test Entity' }];
      const mockResponse = { items: mockItems, total: 1, page: 1, pageSize: 50, totalPages: 1 };
      (sportsService.getEntities as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 100);
        });
      });
      
      // Call the method twice in quick succession
      const promise1 = (loader as any)._fetchEntitiesWithFilter('league', 'id', '1');
      const promise2 = (loader as any)._fetchEntitiesWithFilter('league', 'id', '1');
      
      // Check that they're the same promise
      expect(promise1).toBe(promise2);
      
      // Wait for both to resolve
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // Check the results
      expect(result1).toEqual(mockItems);
      expect(result2).toEqual(mockItems);
      
      // Check that getEntities was only called once
      expect(sportsService.getEntities).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors gracefully', async () => {
      // Mock the getEntities method to throw an error
      const mockError = new Error('API error');
      (sportsService.getEntities as jest.Mock).mockRejectedValue(mockError);
      
      // Call the method and expect it to throw
      await expect((loader as any)._fetchEntitiesWithFilter('league', 'id', '1')).rejects.toThrow(mockError);
      
      // Check that the result was not cached
      expect(apiCache.set).not.toHaveBeenCalled();
    });
  });
  
  describe('loadRelationships', () => {
    it('should load relationships for a single entity', async () => {
      // Setup mock responses
      const mockDivisions = [{ id: 'd1', name: 'Division 1', league_id: 'l1' }];
      const mockTeams = [{ id: 't1', name: 'Team 1', league_id: 'l1' }];
      
      // Mock _fetchEntitiesWithFilter to return different results based on the arguments
      (loader as any)._fetchEntitiesWithFilter = jest.fn()
        .mockImplementation((entityType, field, value) => {
          if (entityType === 'division_conference') {
            return Promise.resolve(mockDivisions);
          } else if (entityType === 'team') {
            return Promise.resolve(mockTeams);
          }
          return Promise.resolve([]);
        });
      
      // The test entity
      const entity = { id: 'l1', name: 'League 1' };
      
      // Call the method
      const result = await loader.loadRelationships(entity, 'league');
      
      // Check the result
      expect(result).toEqual({
        division_conference: mockDivisions,
        team: mockTeams,
        league_executive: [],
        broadcast_rights: []
      });
      
      // Check that _fetchEntitiesWithFilter was called with the correct parameters
      expect((loader as any)._fetchEntitiesWithFilter).toHaveBeenCalledWith(
        'division_conference', 'league_id', 'l1', true
      );
      expect((loader as any)._fetchEntitiesWithFilter).toHaveBeenCalledWith(
        'team', 'league_id', 'l1', true
      );
    });
    
    it('should handle undefined entity gracefully', async () => {
      const result = await loader.loadRelationships(undefined, 'league');
      expect(result).toEqual({});
    });
    
    it('should handle missing relationship configurations', async () => {
      // Mock the entity type with no relationship configurations
      const mockEntity = { id: 'test', name: 'Test' };
      const result = await loader.loadRelationships(mockEntity, 'league' as any, []);
      expect(result).toEqual({});
    });
  });
  
  describe('loadRelationshipsForMultiple', () => {
    it('should load relationships for multiple entities', async () => {
      // Mock loadRelationships to return different results for different entities
      loader.loadRelationships = jest.fn()
        .mockImplementation((entity, entityType) => {
          if (entity.id === 'l1') {
            return Promise.resolve({ 
              division_conference: [{ id: 'd1', name: 'Division 1' }],
              team: [{ id: 't1', name: 'Team 1' }]
            });
          } else if (entity.id === 'l2') {
            return Promise.resolve({
              division_conference: [{ id: 'd2', name: 'Division 2' }],
              team: [{ id: 't2', name: 'Team 2' }]
            });
          }
          return Promise.resolve({});
        });
      
      // The test entities
      const entities = [
        { id: 'l1', name: 'League 1' },
        { id: 'l2', name: 'League 2' }
      ];
      
      // Call the method
      const result = await loader.loadRelationshipsForMultiple(entities, 'league');
      
      // Check the result
      expect(result).toEqual({
        'l1': {
          division_conference: [{ id: 'd1', name: 'Division 1' }],
          team: [{ id: 't1', name: 'Team 1' }]
        },
        'l2': {
          division_conference: [{ id: 'd2', name: 'Division 2' }],
          team: [{ id: 't2', name: 'Team 2' }]
        }
      });
      
      // Check that loadRelationships was called for each entity
      expect(loader.loadRelationships).toHaveBeenCalledTimes(2);
      expect(loader.loadRelationships).toHaveBeenCalledWith(
        entities[0], 'league', undefined, true
      );
      expect(loader.loadRelationships).toHaveBeenCalledWith(
        entities[1], 'league', undefined, true
      );
    });
    
    it('should handle empty entities array', async () => {
      const result = await loader.loadRelationshipsForMultiple([], 'league');
      expect(result).toEqual({});
    });
    
    it('should handle entities with no ID', async () => {
      const entities = [{ name: 'No ID' }];
      const result = await loader.loadRelationshipsForMultiple(entities, 'league');
      expect(result).toEqual({});
    });
  });
  
  describe('preloadEntitySet', () => {
    it('should preload a set of entity types', async () => {
      // Mock _fetchEntitiesWithFilter to return different results based on the entity type
      (loader as any)._fetchEntitiesWithFilter = jest.fn()
        .mockImplementation((entityType) => {
          if (entityType === 'league') {
            return Promise.resolve([{ id: 'l1', name: 'League 1' }]);
          } else if (entityType === 'division_conference') {
            return Promise.resolve([{ id: 'd1', name: 'Division 1' }]);
          } else if (entityType === 'team') {
            return Promise.resolve([{ id: 't1', name: 'Team 1' }]);
          } else if (entityType === 'stadium') {
            return Promise.resolve([{ id: 's1', name: 'Stadium 1' }]);
          } else if (entityType === 'brand') {
            return Promise.resolve([{ id: 'b1', name: 'Brand 1' }]);
          }
          return Promise.resolve([]);
        });
      
      // Call the method
      const result = await loader.preloadEntitySet('FORM_BASICS', 50);
      
      // Check the result
      expect(result).toEqual({
        league: [{ id: 'l1', name: 'League 1' }],
        division_conference: [{ id: 'd1', name: 'Division 1' }],
        team: [{ id: 't1', name: 'Team 1' }],
        stadium: [{ id: 's1', name: 'Stadium 1' }],
        brand: [{ id: 'b1', name: 'Brand 1' }]
      });
    });
    
    it('should handle unknown entity set', async () => {
      console.error = jest.fn(); // Mock console.error
      const result = await loader.preloadEntitySet('UNKNOWN_SET' as any);
      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith(
        'RelationshipLoader: Unknown entity set "UNKNOWN_SET"'
      );
    });
  });
  
  describe('cache management', () => {
    it('should clear cache for a specific entity type and filter', () => {
      // Call the method
      loader.clearCache('league', 'id', '1');
      
      // Check that the correct cache key was deleted
      expect(apiCache.delete).toHaveBeenCalledWith('relationship_league_id_1');
    });
    
    it('should clear all relationship cache', () => {
      // Mock apiCache.keys to return relationship cache keys
      (apiCache.keys as jest.Mock).mockReturnValue([
        'relationship_league_id_1',
        'relationship_team_league_id_1',
        'all_league_limit_50',
        'some_other_key'
      ]);
      
      // Call the method
      loader.clearAllCache();
      
      // Check that only the relationship and all_ cache keys were deleted
      expect(apiCache.delete).toHaveBeenCalledTimes(3);
      expect(apiCache.delete).toHaveBeenCalledWith('relationship_league_id_1');
      expect(apiCache.delete).toHaveBeenCalledWith('relationship_team_league_id_1');
      expect(apiCache.delete).toHaveBeenCalledWith('all_league_limit_50');
      expect(apiCache.delete).not.toHaveBeenCalledWith('some_other_key');
    });
  });
  
  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(relationshipLoader).toBeInstanceOf(RelationshipLoader);
    });
  });
});