import { 
  formatCellValue, 
  isRelationshipField, 
  isSortableRelationshipField,
  getDisplayValue,
  getEntityTypeName
} from '../formatters';

describe('formatters utility functions', () => {
  describe('formatCellValue', () => {
    it('returns N/A for null or undefined values', () => {
      expect(formatCellValue(null, 'field')).toBe('N/A');
      expect(formatCellValue(undefined, 'field')).toBe('N/A');
    });

    it('handles date fields properly', () => {
      const date = '2023-10-15';
      expect(formatCellValue(date, 'start_date')).toBe(new Date(date).toLocaleDateString());
    });

    it('formats boolean values as Yes/No', () => {
      expect(formatCellValue(true, 'active')).toBe('Yes');
      expect(formatCellValue(false, 'active')).toBe('No');
    });

    it('handles special case for broadcast entities', () => {
      expect(formatCellValue('ESPN - USA', 'name', 'broadcast_rights')).toBe('ESPN');
    });

    it('strips (Brand) text from company names', () => {
      expect(formatCellValue('ESPN (Brand)', 'broadcast_company_name')).toBe('ESPN');
    });
  });

  describe('isRelationshipField', () => {
    it('identifies ID fields with corresponding name fields', () => {
      const entity = { 
        league_id: '123', 
        league_name: 'NFL' 
      };
      expect(isRelationshipField('league_id', entity)).toBe(true);
    });

    it('returns false for ID fields without corresponding name fields', () => {
      const entity = { league_id: '123' };
      expect(isRelationshipField('league_id', entity)).toBe(false);
    });

    it('returns false for non-ID fields', () => {
      const entity = { name: 'Test' };
      expect(isRelationshipField('name', entity)).toBe(false);
    });
  });

  describe('isSortableRelationshipField', () => {
    it('identifies known relationship fields', () => {
      const entities = [{ id: '1', name: 'Test' }];
      expect(isSortableRelationshipField('league_name', entities)).toBe(true);
      expect(isSortableRelationshipField('league_sport', entities)).toBe(true);
      expect(isSortableRelationshipField('entity_name', entities)).toBe(true);
    });

    it('identifies ID fields with corresponding name fields as relationship fields', () => {
      const entities = [{ 
        id: '1', 
        league_id: '123',
        league_name: 'NFL' 
      }];
      expect(isSortableRelationshipField('league_id', entities)).toBe(true);
    });

    it('returns false for non-relationship fields', () => {
      const entities = [{ id: '1', name: 'Test' }];
      expect(isSortableRelationshipField('name', entities)).toBe(false);
      expect(isSortableRelationshipField('description', entities)).toBe(false);
    });

    it('returns false when entities array is empty', () => {
      expect(isSortableRelationshipField('league_name', [])).toBe(false);
    });
  });

  describe('getDisplayValue', () => {
    it('returns formatted value for regular fields', () => {
      const entity = { name: 'Test Entity' };
      expect(getDisplayValue(entity, 'name')).toBe('Test Entity');
    });

    it('returns name instead of ID for relationship fields when showing names', () => {
      const entity = { 
        league_id: '123', 
        league_name: 'NFL' 
      };
      expect(getDisplayValue(entity, 'league_id', 'team', false)).toBe('NFL');
    });

    it('returns ID for relationship fields when showing IDs', () => {
      const entity = { 
        league_id: '123', 
        league_name: 'NFL' 
      };
      expect(getDisplayValue(entity, 'league_id', 'team', true)).toBe('123');
    });

    it('extracts territory from broadcast entity name', () => {
      const entity = { name: 'ESPN - USA' };
      expect(getDisplayValue(entity, 'territory', 'broadcast_rights')).toBe('USA');
    });
  });

  describe('getEntityTypeName', () => {
    it('returns proper display name for entity types', () => {
      expect(getEntityTypeName('league')).toBe('Leagues');
      expect(getEntityTypeName('team')).toBe('Teams');
      expect(getEntityTypeName('broadcast_rights')).toBe('Broadcast Rights');
    });

    it('returns the original string if no match is found', () => {
      expect(getEntityTypeName('unknown_type' as any)).toBe('unknown_type');
    });
  });
});