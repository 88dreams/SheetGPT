import { describe, it, expect } from '@jest/globals';
import { detectEntityType, getRecommendedEntityType } from '../entityDetection';

describe('entityDetection', () => {
  describe('detectEntityType', () => {
    it('should detect league entity type when league fields are present', () => {
      const sourceFields = ['name', 'sport', 'country', 'league_id'];
      const sourceFieldValues = {
        name: 'NBA',
        sport: 'Basketball',
        country: 'USA',
        league_id: '123'
      };

      const result = detectEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('league');
    });

    it('should detect league entity type when league values are present', () => {
      const sourceFields = ['name', 'sport', 'country'];
      const sourceFieldValues = {
        name: 'NBA',
        sport: 'Basketball',
        country: 'USA'
      };

      const result = detectEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('league');
    });

    it('should detect player entity type when position field is present', () => {
      const sourceFields = ['name', 'team_id', 'position'];
      const sourceFieldValues = {
        name: 'LeBron James',
        team_id: '123',
        position: 'Forward'
      };

      const result = detectEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('player');
    });

    it('should detect stadium entity type when stadium fields are present', () => {
      const sourceFields = ['name', 'city', 'country', 'capacity', 'stadium'];
      const sourceFieldValues = {
        name: 'Staples Center',
        city: 'Los Angeles',
        country: 'USA',
        capacity: 20000,
        stadium: 'yes'
      };

      const result = detectEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('stadium');
    });

    it('should return null for unrecognized entity type', () => {
      const sourceFields = ['foo', 'bar', 'baz'];
      const sourceFieldValues = {
        foo: 'value1',
        bar: 'value2',
        baz: 'value3'
      };

      const result = detectEntityType(sourceFields, sourceFieldValues);
      expect(result).toBeNull();
    });
  });

  describe('getRecommendedEntityType', () => {
    it('should recommend league entity type when sport field is present', () => {
      const sourceFields = ['name', 'sport'];
      const sourceFieldValues = {
        name: 'NBA',
        sport: 'Basketball'
      };

      const result = getRecommendedEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('league');
    });

    it('should recommend league entity type when capacity field is present', () => {
      const sourceFields = ['name', 'city', 'country', 'capacity', 'arena'];
      const sourceFieldValues = {
        name: 'Staples Center',
        city: 'Los Angeles',
        country: 'USA',
        capacity: 20000,
        arena: 'Basketball Arena'
      };

      const result = getRecommendedEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('league');
    });

    it('should recommend player entity type when position field is present', () => {
      const sourceFields = ['name', 'position'];
      const sourceFieldValues = {
        name: 'LeBron James',
        position: 'Forward'
      };

      const result = getRecommendedEntityType(sourceFields, sourceFieldValues);
      expect(result).toBe('player');
    });

    it('should return null when no recommendation can be made', () => {
      const sourceFields = ['foo', 'bar'];
      const sourceFieldValues = {
        foo: 'value1',
        bar: 'value2'
      };

      const result = getRecommendedEntityType(sourceFields, sourceFieldValues);
      expect(result).toBeNull();
    });
  });
}); 